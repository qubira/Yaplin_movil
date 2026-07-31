import { useState, useMemo, useEffect, useCallback, ReactNode } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Share, Image,
  Modal, LayoutAnimation, Platform, UIManager, Linking, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { PaymentColors } from '../../../constants/colors';
import { useTheme } from '../../../constants/theme';
import { formatAmount, formatDate, formatTime, Transaction } from '../../../mocks/transactions';
import { useTransactions, TransactionEvent, ConfirmationInput } from '../../../store/PaymentsStore';
import { useStores } from '../../../store/StoresStore';
import { Store } from '../../../mocks/stores';
import { useAuth } from '../../../store/AuthStore';
import { useTranslation } from '../../../store/LocaleStore';
import { ApiError } from '../../../services/api';
import { dictionaries } from '../../../translations';
import Avatar from '../../../components/ui/Avatar';
import Input from '../../../components/ui/Input';
import { useBottomSheet } from '../../../store/BottomSheetStore';

const SUPPORT_EMAIL = 'qubirasac@gmail.com';

function isArchivedClient(timestamp: Date): boolean {
  return timestamp.getFullYear() < new Date().getFullYear();
}

function isTodayClient(timestamp: Date): boolean {
  const now = new Date();
  return timestamp.getFullYear() === now.getFullYear() && timestamp.getMonth() === now.getMonth() && timestamp.getDate() === now.getDate();
}

// Client-side mirror of canRoute() in backend/src/routes/transactions.ts —
// used only to decide which UI to show; the backend re-checks everything
// itself and is the real authority. Returns the list of valid destinations
// (a real store, or `null` for "back to GENERAL") for the given user/payment.
function routeOptions(
  role: 'owner' | 'supervisor' | 'cajero',
  userStoreId: string | null,
  txn: Transaction,
  stores: Store[]
): { id: string | null; name: string }[] {
  const generalOption = { id: null, name: '' }; // name filled in by caller via translation
  if (role === 'owner') {
    return [generalOption, ...stores.filter(s => s.id !== txn.storeId).map(s => ({ id: s.id, name: s.name }))];
  }
  if (!isTodayClient(txn.timestamp)) return [];
  if (role === 'cajero') {
    if (txn.storeId !== null || !userStoreId) return [];
    const mine = stores.find(s => s.id === userStoreId);
    return mine ? [{ id: mine.id, name: mine.name }] : [];
  }
  // Supervisor: may only send a payment to GENERAL or to their OWN store —
  // never to a different specific store — and may only touch a payment
  // that is currently in GENERAL or already at their own store (matches
  // canRoute() in backend/src/routes/transactions.ts exactly).
  if (userStoreId === null) {
    // No store assigned: there is no "suya" to send to, so the only valid
    // destination is GENERAL, and only for payments not already there.
    return txn.storeId !== null ? [generalOption] : [];
  }
  if (txn.storeId !== null && txn.storeId !== userStoreId) return []; // another store's payment: out of reach
  if (txn.storeId === null) {
    const mine = stores.find(s => s.id === userStoreId);
    return mine ? [{ id: mine.id, name: mine.name }] : [];
  }
  // txn.storeId === userStoreId: the only valid move is back to GENERAL
  return [generalOption];
}

function apiErrorMessage(e: unknown, t: typeof dictionaries['es']): string {
  if (e instanceof ApiError) {
    if (e.code === 'VOIDED') return t.transaction.errors.voided;
    if (e.code === 'ARCHIVED') return t.transaction.errors.archived;
    if (e.code === 'VERSION_CONFLICT') return t.transaction.errors.versionConflict;
    if (e.code === 'CONFIRMATION_REQUIRED') return t.transaction.errors.confirmationRequired;
    if (e.code === 'CONFIRMATION_INVALID') return t.transaction.errors.confirmationInvalid;
    if (e.status === 403) return t.transaction.errors.forbidden;
  }
  return t.transaction.errors.generic;
}

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

const METHOD = {
  yape:   { label: 'Yape',   logo: require('../../../assets/images/brands/yape.png'),   color: PaymentColors.yape,   gradientColors: ['#2D1060','#1A0A3C'] as [string, string] },
  plin:   { label: 'Plin',   logo: require('../../../assets/images/brands/plin.png'),   color: PaymentColors.plin,   gradientColors: ['#003D28','#001A12'] as [string, string] },
  izipay: { label: 'Izipay', logo: require('../../../assets/images/brands/izipay.png'), color: PaymentColors.izipay, gradientColors: ['#4A0008','#1E0004'] as [string, string] },
  // No brand asset for manually-entered payments — `logo` is null and every
  // render site below falls back to an Ionicon whenever it is.
  manual: { label: 'Manual', logo: null as any,                                          color: PaymentColors.manual, gradientColors: ['#3A3A3C','#1C1C1E'] as [string, string] },
} as const;

function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: c.BORDER }}>
      <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular' }}>{label}</Text>
      <Text style={{ color: valueColor ?? c.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', maxWidth: '60%', textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

function HistoryItem({ txn, isLast }: { txn: Transaction; isLast: boolean }) {
  const { c } = useTheme();
  const brand = METHOD[txn.method];
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 14, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: c.BORDER }}>
      <View style={{ width: 24, alignItems: 'center', marginRight: 12, paddingTop: 6 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: brand.color }} />
        {!isLast && <View style={{ flex: 1, width: 2, backgroundColor: c.BORDER, marginTop: 4 }} />}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: `${brand.color}22` }}>
            {brand.logo ? (
              <Image source={brand.logo} style={{ width: 22, height: 22 }} resizeMode="contain" />
            ) : (
              <Ionicons name="create-outline" size={20} color={brand.color} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{brand.label}</Text>
            <Text style={{ color: c.TEXT_SECONDARY, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 }}>{formatDate(txn.timestamp)} · {formatTime(txn.timestamp)}</Text>
          </View>
          <Text style={{ color: c.SUCCESS, fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>{formatAmount(txn.amount)}</Text>
        </View>
        <Text style={{ color: brand.color, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 6 }}>{txn.reference}</Text>
      </View>
    </View>
  );
}

function ModalTxnRow({ txn, noBorder }: { txn: Transaction; noBorder?: boolean }) {
  const { c } = useTheme();
  const brand = METHOD[txn.method];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12, borderBottomWidth: noBorder ? 0 : 1, borderBottomColor: c.BORDER }}>
      <View style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: `${brand.color}25`, borderColor: `${brand.color}50` }}>
        {brand.logo ? (
          <Image source={brand.logo} style={{ width: 22, height: 22 }} resizeMode="contain" />
        ) : (
          <Ionicons name="create-outline" size={20} color={brand.color} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{brand.label}</Text>
        <Text style={{ color: c.TEXT_SECONDARY, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 }}>{formatDate(txn.timestamp)} · {formatTime(txn.timestamp)}</Text>
        <Text style={{ color: brand.color, fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 3 }}>{txn.reference}</Text>
      </View>
      <Text style={{ color: c.SUCCESS, fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>{formatAmount(txn.amount)}</Text>
    </View>
  );
}

// Shared double-confirmation input: a PIN keypad if the owner configured
// one, otherwise a plain "type CONFIRMAR" text field — mirrors
// verifyConfirmation() in backend/src/routes/transactions.ts exactly, so the
// UI asks for whichever the backend will actually check.
function ConfirmField({ hasPin, value, onChangeText }: { hasPin: boolean; value: string; onChangeText: (v: string) => void }) {
  const t = useTranslation();
  return hasPin ? (
    <Input
      label={t.transaction.confirmStep.pinTitle}
      placeholder={t.transaction.confirmStep.pinPlaceholder}
      value={value}
      onChangeText={(v) => onChangeText(v.replace(/[^0-9]/g, '').slice(0, 8))}
      keyboardType="number-pad"
      secureTextEntry
      leftIcon="keypad-outline"
    />
  ) : (
    <Input
      label={t.transaction.confirmStep.textDescription(t.transaction.confirmStep.textPlaceholder)}
      placeholder={t.transaction.confirmStep.textPlaceholder}
      value={value}
      onChangeText={onChangeText}
      autoCapitalize="characters"
      leftIcon="checkmark-done-outline"
    />
  );
}

function TimelineRow({ event, isLast }: { event: TransactionEvent; isLast: boolean }) {
  const { c } = useTheme();
  const t = useTranslation();
  const { stores } = useStores();

  const iconByType: Record<TransactionEvent['type'], keyof typeof Ionicons.glyphMap> = {
    CAPTURED: 'download-outline',
    MANUAL_CREATED: 'create-outline',
    ASSIGNED: 'arrow-redo-outline',
    RETURNED_TO_GENERAL: 'arrow-undo-outline',
    AMOUNT_CORRECTED: 'pencil-outline',
    VOIDED: 'ban-outline',
    VOID_REVERSED: 'refresh-outline',
    NOTE_ADDED: 'chatbox-ellipses-outline',
  };

  const actorLabel = event.actorRole === 'system'
    ? t.transaction.systemActor
    : `${event.actorName} (${event.actorRole === 'owner' ? t.common.roles.owner : event.actorRole === 'supervisor' ? t.common.roles.supervisor : t.common.roles.cajero})`;

  function storeName(storeId: unknown): string {
    if (storeId === null || storeId === undefined) return t.common.generalPoolLabel;
    return stores.find(s => s.id === storeId)?.name ?? t.common.generalPoolLabel;
  }

  let detail: string | null = null;
  if (event.type === 'ASSIGNED') {
    detail = t.transaction.eventDetail.toStore(storeName(event.payload.toStoreId));
  } else if (event.type === 'RETURNED_TO_GENERAL') {
    detail = t.transaction.eventDetail.toGeneral;
  } else if (event.type === 'AMOUNT_CORRECTED') {
    const prev = Number(event.payload.previousAmount);
    const next = Number(event.payload.newAmount);
    const delta = Number(event.payload.delta);
    detail = t.transaction.eventDetail.amountChange(formatAmount(prev), formatAmount(next), `${delta >= 0 ? '+' : ''}${formatAmount(delta)}`);
  } else if ((event.type === 'VOIDED' || event.type === 'VOID_REVERSED') && typeof event.payload.reason === 'string') {
    detail = t.transaction.eventDetail.reason(event.payload.reason);
  }

  return (
    <View style={{ flexDirection: 'row', paddingVertical: 12, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: c.BORDER }}>
      <View style={{ width: 28, alignItems: 'center', marginRight: 10, paddingTop: 2 }}>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: `${c.ACCENT_PURPLE}22`, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={iconByType[event.type]} size={13} color={c.ACCENT_PURPLE} />
        </View>
        {!isLast && <View style={{ flex: 1, width: 2, backgroundColor: c.BORDER, marginTop: 4 }} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.TEXT_PRIMARY, fontSize: 13, fontFamily: 'Inter_600SemiBold', fontWeight: '600' }}>
          {actorLabel} {t.transaction.events[event.type]}
        </Text>
        {!!detail && (
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 }}>{detail}</Text>
        )}
        <Text style={{ color: c.TEXT_SECONDARY, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 3 }}>
          {formatDate(new Date(event.createdAt))} · {formatTime(new Date(event.createdAt))}
        </Text>
      </View>
    </View>
  );
}

interface ActionModalShellProps {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  submitting: boolean;
  error: string;
  submitColor?: string;
  children: ReactNode;
}

function ActionModalShell({ title, onClose, onSubmit, submitLabel, submitting, error, submitColor, children }: ActionModalShellProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useTranslation();
  return (
    <View style={{
      backgroundColor: c.BACKGROUND_CARD, borderTopLeftRadius: 32, borderTopRightRadius: 20,
      padding: 24, paddingBottom: insets.bottom + 20, maxHeight: '90%',
      shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 24,
    }}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.BORDER, alignSelf: 'center', marginBottom: 20 }} />
        <Text style={{ color: c.TEXT_PRIMARY, fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 16 }}>{title}</Text>
        {children}
        {!!error && <Text style={{ color: c.ACCENT_RED, fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 8 }}>{error}</Text>}
        <TouchableOpacity onPress={onSubmit} disabled={submitting}
          style={{ marginTop: 8, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: submitColor ?? c.ACCENT_PURPLE, opacity: submitting ? 0.7 : 1 }}>
          {submitting ? <ActivityIndicator color="#fff" /> : (
            <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>{submitLabel}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} disabled={submitting}
          style={{ marginTop: 10, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.BACKGROUND_CARD_2, borderWidth: 1, borderColor: c.BORDER }}>
          <Text style={{ color: c.TEXT_PRIMARY, fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>{t.common.actions.cancel}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function MoveSheetContent({ moveOptions, onClose, onMove }: {
  moveOptions: { id: string | null; name: string }[];
  onClose: () => void;
  onMove: (targetId: string | null) => Promise<void>;
}) {
  const { c } = useTheme();
  const t = useTranslation();
  const [moveTarget, setMoveTarget] = useState<{ id: string | null; name: string } | null>(null);
  const [moveSearch, setMoveSearch] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!moveTarget) return;
    setSubmitting(true);
    setError('');
    try {
      await onMove(moveTarget.id);
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ActionModalShell title={t.transaction.moveModal.title} onClose={onClose} onSubmit={handleSubmit}
      submitLabel={t.transaction.moveModal.submit} submitting={submitting} error={error}>
      <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21, marginBottom: 16 }}>
        {t.transaction.moveModal.description}
      </Text>
      {moveOptions.length > 5 && (
        <>
          <Input
            placeholder={t.common.storePicker.searchPlaceholder}
            value={moveSearch}
            onChangeText={setMoveSearch}
            leftIcon="search-outline"
          />
          <View style={{ height: 8 }} />
        </>
      )}
      <View style={{ gap: 8, marginBottom: 8 }}>
        {moveOptions
          .filter(option => {
            if (option.id === null) return true;
            const term = moveSearch.trim().toLowerCase();
            return !term || option.name.toLowerCase().includes(term);
          })
          .map(option => {
            const active = moveTarget?.id === option.id;
            return (
              <TouchableOpacity key={option.id ?? '__general__'} onPress={() => setMoveTarget(option)}
                style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, borderWidth: 1, backgroundColor: active ? c.ACCENT_PURPLE : c.BACKGROUND_CARD_2, borderColor: active ? c.ACCENT_PURPLE : c.BORDER }}>
                <Text style={{ flex: 1, color: active ? '#fff' : c.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
                  {option.id === null ? t.transaction.moveModal.generalOption : option.name}
                </Text>
                {active && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
              </TouchableOpacity>
            );
          })}
      </View>
    </ActionModalShell>
  );
}

function CorrectSheetContent({ transaction, hasPin, onClose, onCorrect }: {
  transaction: Transaction;
  hasPin: boolean;
  onClose: () => void;
  onCorrect: (delta: number, reason: string, confirm: ConfirmationInput) => Promise<void>;
}) {
  const t = useTranslation();
  const [newAmountText, setNewAmountText] = useState(String(transaction.amount));
  const [correctReason, setCorrectReason] = useState('');
  const [confirmValue, setConfirmValue] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const newAmount = parseFloat(newAmountText.replace(',', '.'));
    if (!Number.isFinite(newAmount) || newAmount === transaction.amount) {
      setError(t.transaction.correctModal.invalidAmount);
      return;
    }
    if (!correctReason.trim()) {
      setError(t.transaction.correctModal.reasonRequired);
      return;
    }
    const delta = Math.round((newAmount - transaction.amount) * 100) / 100;
    const confirm: ConfirmationInput = hasPin ? { confirmPin: confirmValue } : { confirmText: confirmValue };
    setSubmitting(true);
    setError('');
    try {
      await onCorrect(delta, correctReason.trim(), confirm);
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, t));
      if (e instanceof ApiError && e.code === 'CONFIRMATION_INVALID') setConfirmValue('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ActionModalShell title={t.transaction.correctModal.title} onClose={onClose} onSubmit={handleSubmit}
      submitLabel={t.transaction.correctModal.submit} submitting={submitting} error={error}>
      <Input
        label={t.transaction.correctModal.newAmountLabel}
        value={newAmountText}
        onChangeText={setNewAmountText}
        keyboardType="decimal-pad"
        leftIcon="cash-outline"
      />
      <Input
        label={t.transaction.correctModal.reasonLabel}
        placeholder={t.transaction.correctModal.reasonPlaceholder}
        value={correctReason}
        onChangeText={setCorrectReason}
        leftIcon="document-text-outline"
      />
      <ConfirmField hasPin={hasPin} value={confirmValue} onChangeText={setConfirmValue} />
    </ActionModalShell>
  );
}

export default function TransactionDetailScreen() {
  const { c, toggle } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const t = useTranslation();
  const MES_ABR = t.common.months.abbr;
  const MES_FULL = t.common.months.full;
  const { transactions, fetchTransactionEvents, fetchTransactionById, routeTransaction, correctAmount, refreshTransactions } = useTransactions();
  const { stores } = useStores();
  const { user } = useAuth();

  // GET /transactions (the shared list this screen normally reads from)
  // only ever contains already-assigned payments — anything still sitting
  // in GENERAL is never in it, so opening its detail from the GENERAL
  // screen would otherwise always show "not found". Fall back to fetching
  // it directly by id whenever it's not in the already-loaded list.
  const [fetchedTransaction, setFetchedTransaction] = useState<Transaction | null>(null);
  const [fetchingTransaction, setFetchingTransaction] = useState(false);
  const transaction = transactions.find(t => t.id === id) ?? fetchedTransaction ?? undefined;

  useEffect(() => {
    if (!id || transactions.some(t => t.id === id)) return;
    let cancelled = false;
    setFetchingTransaction(true);
    fetchTransactionById(id)
      .then((t) => { if (!cancelled) setFetchedTransaction(t); })
      .catch(() => { if (!cancelled) setFetchedTransaction(null); })
      .finally(() => { if (!cancelled) setFetchingTransaction(false); });
    return () => { cancelled = true; };
  }, [id, transactions, fetchTransactionById]);

  const [historyModal, setHistoryModal] = useState(false);
  const [filterKey, setFilterKey]       = useState<string>('all');
  const [collapsed, setCollapsed]       = useState<Set<string>>(new Set());
  const [supportModal, setSupportModal] = useState(false);

  // ── Timeline ──
  const [events, setEvents] = useState<TransactionEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(false);
  const [refreshingDetail, setRefreshingDetail] = useState(false);

  const loadEvents = useCallback(async () => {
    if (!id) return;
    setEventsLoading(true);
    setEventsError(false);
    try {
      const remote = await fetchTransactionEvents(id);
      setEvents(remote);
    } catch {
      setEventsError(true);
    } finally {
      setEventsLoading(false);
    }
  }, [id, fetchTransactionEvents]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // ── Owner/routing actions ── anular ya no existe para ningún rol; un pago
  // capturado es inmutable en su estado activo/anulado (queda solo mover y
  // corregir monto, ambas eventos, nunca una eliminación).
  const { present, dismiss } = useBottomSheet();

  const history = useMemo(() =>
    transaction
      ? transactions.filter(t => t.payerName === transaction.payerName && t.id !== transaction.id)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      : [],
    [transaction, transactions]);
  const historyPreview = history.slice(0, 5);

  const allPayerTxns = useMemo(() =>
    transaction
      ? transactions.filter(t => t.payerName === transaction.payerName)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      : [],
    [transaction, transactions]);

  const totalFromPayer = allPayerTxns.reduce((s, t) => s + t.amount, 0);

  const monthGroups = useMemo(() => {
    const seen = new Set<string>();
    const groups: { key: string; year: number; month: number; txns: Transaction[]; subtotal: number }[] = [];
    allPayerTxns.forEach(t => {
      const y = t.timestamp.getFullYear(), mo = t.timestamp.getMonth(), k = `${y}-${mo}`;
      if (!seen.has(k)) {
        seen.add(k);
        const txns = allPayerTxns.filter(x => x.timestamp.getFullYear() === y && x.timestamp.getMonth() === mo);
        groups.push({ key: k, year: y, month: mo, txns, subtotal: txns.reduce((s, x) => s + x.amount, 0) });
      }
    });
    return groups;
  }, [allPayerTxns]);

  const visibleGroups  = filterKey === 'all' ? monthGroups : monthGroups.filter(g => g.key === filterKey);
  const filteredTotal  = visibleGroups.reduce((s, g) => s + g.subtotal, 0);
  const filteredCount  = visibleGroups.reduce((s, g) => s + g.txns.length, 0);

  const filteredBreakdown = useMemo(() => {
    const txns = visibleGroups.flatMap(g => g.txns);
    const out: Partial<Record<Transaction['method'], { count: number; total: number }>> = {};
    txns.forEach(t => {
      if (!out[t.method]) out[t.method] = { count: 0, total: 0 };
      out[t.method]!.count++; out[t.method]!.total += t.amount;
    });
    return out;
  }, [filterKey, monthGroups]);

  const isOwner = user?.role === 'owner';
  const isVoided = transaction?.status === 'voided';
  const isEdited = !!transaction && transaction.amount !== transaction.originalAmount;
  const archived = transaction ? isArchivedClient(transaction.timestamp) : false;
  const canCorrect = isOwner && !!transaction && !archived && !isVoided;

  const moveOptions = useMemo(() => {
    if (!transaction || !user) return [];
    return routeOptions(user.role, user.storeId, transaction, stores).map(o =>
      o.id === null ? { id: null, name: t.common.generalPoolLabel } : o
    );
  }, [transaction, user, stores, t]);
  const canMove = moveOptions.length > 0 && !isVoided && !archived;

  // refreshTransactions() only refetches the assigned-only shared list — a
  // transaction here via the GENERAL fallback needs its own dedicated
  // re-fetch too, or a version-conflict retry would keep using stale data.
  async function refreshCurrentTransaction() {
    await refreshTransactions().catch(() => {});
    if (id && !transactions.some(t => t.id === id)) {
      await fetchTransactionById(id).then(setFetchedTransaction).catch(() => {});
    }
  }

  async function handleManualRefresh() {
    if (refreshingDetail) return;
    setRefreshingDetail(true);
    await Promise.all([refreshCurrentTransaction(), loadEvents()]);
    setRefreshingDetail(false);
  }

  function openMoveSheet() {
    if (!transaction) return;
    present(
      <MoveSheetContent
        moveOptions={moveOptions}
        onClose={dismiss}
        onMove={async (targetId) => {
          try {
            await routeTransaction(transaction.id, targetId, transaction.version);
            loadEvents();
          } catch (e) {
            if (e instanceof ApiError && e.code === 'VERSION_CONFLICT') await refreshCurrentTransaction();
            throw e;
          }
        }}
      />
    );
  }

  function openCorrectSheet() {
    if (!transaction) return;
    present(
      <CorrectSheetContent
        transaction={transaction}
        hasPin={!!user?.hasTransactionPin}
        onClose={dismiss}
        onCorrect={async (delta, reason, confirm) => {
          try {
            await correctAmount(transaction.id, delta, reason, transaction.version, confirm);
            loadEvents();
          } catch (e) {
            if (e instanceof ApiError && e.code === 'VERSION_CONFLICT') await refreshCurrentTransaction();
            throw e;
          }
        }}
      />
    );
  }

  if (!transaction) {
    return (
      <View style={{ flex: 1, backgroundColor: c.BACKGROUND_DARK, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <StatusBar style={c.isDark ? 'light' : 'dark'} />
        {fetchingTransaction ? (
          <ActivityIndicator color={c.ACCENT_PURPLE} />
        ) : (
          <>
            <Ionicons name="receipt-outline" size={40} color={c.TEXT_SECONDARY} />
            <Text style={{ color: c.TEXT_SECONDARY, fontSize: 15, fontFamily: 'Inter_400Regular', marginTop: 12, textAlign: 'center' }}>
              {t.transaction.notFound}
            </Text>
          </>
        )}
        <TouchableOpacity onPress={() => router.back()}
          style={{ marginTop: 20, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, backgroundColor: c.BACKGROUND_CARD_2, borderWidth: 1, borderColor: c.BORDER }}>
          <Text style={{ color: c.TEXT_PRIMARY, fontFamily: 'Inter_600SemiBold' }}>{t.common.actions.back}</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const brand = METHOD[transaction.method];

  function toggleGroup(key: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsed(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  function openModal() { setFilterKey('all'); setCollapsed(new Set()); setHistoryModal(true); }

  const handleShare = async () => {
    await Share.share({ message: t.transaction.shareMessage(transaction.payerName, formatAmount(transaction.amount), brand.label, transaction.reference, formatDate(transaction.timestamp), formatTime(transaction.timestamp)) });
  };

  const handleReportProblem = async () => {
    const storeName = stores.find(s => s.id === transaction.storeId)?.name ?? '—';
    const subject = t.transaction.reportEmail.subject(transaction.reference);
    const body = [
      t.transaction.reportEmail.businessLine(user?.businessName ?? '—', storeName),
      t.transaction.reportEmail.methodLine(brand.label),
      t.transaction.reportEmail.amountLine(formatAmount(transaction.amount)),
      t.transaction.reportEmail.dateLine(formatDate(transaction.timestamp), formatTime(transaction.timestamp)),
      t.transaction.reportEmail.referenceLine(transaction.reference),
      t.transaction.reportEmail.reportedByLine(user?.name ?? '—', user?.email ?? '—'),
      '',
      t.transaction.reportEmail.descriptionLabel,
      t.transaction.reportEmail.descriptionPlaceholder,
    ].join('\n');
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Go straight for openURL instead of gating on canOpenURL first: on
    // Android 11+, package-visibility restrictions make canOpenURL return
    // false for mailto even when a mail app IS installed and would open
    // fine, so a pre-check here produces false negatives.
    try {
      await Linking.openURL(url);
    } catch {
      setSupportModal(true);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.BACKGROUND_DARK }}>
      <StatusBar style="light" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>

        {/* Hero — always dark gradient */}
        <LinearGradient colors={brand.gradientColors} style={{ paddingHorizontal: 24, paddingBottom: 32, alignItems: 'center', paddingTop: insets.top + 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', marginBottom: 24 }}>
            <TouchableOpacity onPress={() => router.back()}
              style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={handleManualRefresh} disabled={refreshingDetail}
                style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                {refreshingDetail ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="refresh-outline" size={20} color="#fff" />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={toggle}
                style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={c.isDark ? 'sunny-outline' : 'moon-outline'} size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ width: 96, height: 96, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: `${brand.color}55`, marginBottom: 20, shadowColor: brand.color, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 }}>
            {brand.logo ? (
              <Image source={brand.logo} style={{ width: 60, height: 60 }} resizeMode="contain" />
            ) : (
              <Ionicons name="create-outline" size={48} color={brand.color} />
            )}
          </View>
          <Text style={{
            color: '#fff', fontSize: 46, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', letterSpacing: -1.5, marginBottom: isEdited ? 4 : 12,
            textDecorationLine: isVoided ? 'line-through' : 'none',
          }}>
            {formatAmount(transaction.amount)}
          </Text>
          {isEdited && (
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 12 }}>
              {t.transaction.editedOriginalAmount(formatAmount(transaction.originalAmount))}
            </Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isVoided ? `${c.ACCENT_RED}22` : `${c.SUCCESS}22`, borderWidth: 1, borderColor: isVoided ? `${c.ACCENT_RED}55` : `${c.SUCCESS}55`, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: isVoided ? c.ACCENT_RED : c.SUCCESS }} />
              <Text style={{ color: isVoided ? c.ACCENT_RED : c.SUCCESS, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
                {isVoided ? t.transaction.voided : t.transaction.confirmed}
              </Text>
            </View>
            {isEdited && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${c.WARNING}22`, borderWidth: 1, borderColor: `${c.WARNING}55`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                <Ionicons name="pencil" size={11} color={c.WARNING} />
                <Text style={{ color: c.WARNING, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{t.transaction.edited}</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, alignSelf: 'stretch' }}>
            <Avatar initials={transaction.payerInitials} size="sm" color={brand.color} />
            <View style={{ marginLeft: 10 }}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{transaction.payerName}</Text>
              <Text style={{ color: brand.color, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 }}>{t.transaction.via(brand.label)}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Detail */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
            {t.transaction.detailTitle}
          </Text>
          <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, paddingHorizontal: 16, overflow: 'hidden' }}>
            <DetailRow label={t.transaction.detail.date}      value={formatDate(transaction.timestamp)} />
            <DetailRow label={t.transaction.detail.time}      value={formatTime(transaction.timestamp)} />
            <DetailRow label={t.transaction.detail.reference} value={transaction.reference} valueColor={c.ACCENT_CYAN} />
            <DetailRow label={t.transaction.detail.method}    value={brand.label} valueColor={brand.color} />
            {isEdited && (
              <DetailRow label={t.transaction.correctModal.currentAmountLabel} value={t.transaction.editedOriginalAmount(formatAmount(transaction.originalAmount))} valueColor={c.WARNING} />
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15 }}>
              <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular' }}>{t.transaction.detail.status}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: isVoided ? `${c.ACCENT_RED}18` : `${c.SUCCESS}18`, borderWidth: 1, borderColor: isVoided ? `${c.ACCENT_RED}44` : `${c.SUCCESS}44`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isVoided ? c.ACCENT_RED : c.SUCCESS }} />
                <Text style={{ color: isVoided ? c.ACCENT_RED : c.SUCCESS, fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
                  {isVoided ? t.transaction.voided : t.transaction.confirmed}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Acciones — mover / corregir (gated client-side, backend re-checks
            everything). Anular ya no existe como acción para ningún rol —
            un pago capturado es inmutable en su estado activo/anulado. */}
        {(canMove || canCorrect) && (
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {canMove && (
                <TouchableOpacity onPress={openMoveSheet} activeOpacity={0.85}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, height: 46, borderRadius: 14, backgroundColor: `${c.ACCENT_CYAN}18`, borderWidth: 1, borderColor: `${c.ACCENT_CYAN}44` }}>
                  <Ionicons name="swap-horizontal-outline" size={16} color={c.ACCENT_CYAN} />
                  <Text style={{ color: c.ACCENT_CYAN, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{t.transaction.actions.move}</Text>
                </TouchableOpacity>
              )}
              {canCorrect && (
                <TouchableOpacity onPress={openCorrectSheet} activeOpacity={0.85}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, height: 46, borderRadius: 14, backgroundColor: `${c.ACCENT_PURPLE}18`, borderWidth: 1, borderColor: `${c.ACCENT_PURPLE}44` }}>
                  <Ionicons name="pencil-outline" size={16} color={c.ACCENT_PURPLE} />
                  <Text style={{ color: c.ACCENT_PURPLE, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{t.transaction.actions.correctAmount}</Text>
                </TouchableOpacity>
              )}
            </View>
            {archived && (
              <Text style={{ color: c.TEXT_SECONDARY, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 10 }}>{t.transaction.blockedArchived}</Text>
            )}
          </View>
        )}

        {/* Historial del pago (timeline) */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
            {t.transaction.timelineTitle}
          </Text>
          <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, paddingHorizontal: 16, overflow: 'hidden' }}>
            {eventsLoading ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator color={c.ACCENT_PURPLE} />
              </View>
            ) : eventsError ? (
              <Text style={{ color: c.ACCENT_RED, fontSize: 13, fontFamily: 'Inter_400Regular', paddingVertical: 16 }}>{t.transaction.timelineLoadError}</Text>
            ) : events.length === 0 ? (
              <Text style={{ color: c.TEXT_SECONDARY, fontSize: 13, fontFamily: 'Inter_400Regular', paddingVertical: 16 }}>{t.transaction.timelineEmpty}</Text>
            ) : (
              events.map((event, i) => <TimelineRow key={event.id} event={event} isLast={i === events.length - 1} />)
            )}
          </View>
        </View>

        {/* Payer summary */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
            {t.transaction.payerSummaryTitle}
          </Text>
          <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Avatar initials={transaction.payerInitials} size="lg" color={brand.color} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.TEXT_PRIMARY, fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>{transaction.payerName}</Text>
              <Text style={{ color: c.TEXT_SECONDARY, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 3 }}>{t.transaction.payerSummary(allPayerTxns.length, formatAmount(totalFromPayer))}</Text>
            </View>
          </View>
        </View>

        {/* History preview */}
        {historyPreview.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ color: c.TEXT_SECONDARY, fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.2 }}>{t.transaction.historyTitle}</Text>
              <TouchableOpacity onPress={openModal}>
                <Text style={{ color: c.ACCENT_CYAN, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>{t.transaction.viewMore}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, paddingHorizontal: 16, overflow: 'hidden' }}>
              {historyPreview.map((txn, i) => (
                <HistoryItem key={txn.id} txn={txn} isLast={i === historyPreview.length - 1} />
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <TouchableOpacity onPress={handleShare} activeOpacity={0.85}
            style={{ height: 56, borderRadius: 18, backgroundColor: `${c.ACCENT_CYAN}18`, borderWidth: 1, borderColor: `${c.ACCENT_CYAN}44`, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
            <Ionicons name="share-outline" size={20} color={c.ACCENT_CYAN} />
            <Text style={{ color: c.ACCENT_CYAN, fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{t.transaction.shareReceipt}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleReportProblem} activeOpacity={0.85}
            style={{ height: 56, borderRadius: 18, backgroundColor: `${c.ACCENT_RED}11`, borderWidth: 1, borderColor: `${c.ACCENT_RED}33`, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Ionicons name="flag-outline" size={20} color={c.ACCENT_RED} />
            <Text style={{ color: c.ACCENT_RED, fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{t.transaction.reportProblem}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ══ HISTORIAL MODAL ══ */}
      <Modal visible={historyModal} animationType="slide" onRequestClose={() => setHistoryModal(false)} statusBarTranslucent navigationBarTranslucent>
        <View style={{ flex: 1, backgroundColor: c.BACKGROUND_DARK }}>
          <StatusBar style={c.isDark ? 'light' : 'dark'} />

          <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: c.BORDER }}>
            <TouchableOpacity onPress={() => setHistoryModal(false)}
              style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.BACKGROUND_CARD_2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.BORDER }}>
              <Ionicons name="arrow-back" size={20} color={c.TEXT_PRIMARY} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ color: c.TEXT_PRIMARY, fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>{t.transaction.historyTitle}</Text>
              <Text style={{ color: c.TEXT_SECONDARY, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 1 }}>{transaction.payerName}</Text>
            </View>
            <Avatar initials={transaction.payerInitials} size="sm" color={brand.color} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>

            {/* Summary card */}
            <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
              <LinearGradient colors={c.STATS_GRADIENT} style={{ borderRadius: 24, padding: 22, borderWidth: 1, borderColor: `${c.ACCENT_PURPLE}40` }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View>
                    <Text style={{ color: c.TEXT_SECONDARY, fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 6 }}>
                      {filterKey === 'all' ? t.transaction.accumulatedAmount : `${MES_FULL[parseInt(filterKey.split('-')[1])]} ${filterKey.split('-')[0]}`}
                    </Text>
                    <Text style={{ color: c.TEXT_PRIMARY, fontSize: 34, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', letterSpacing: -1, marginBottom: 3 }}>
                      {formatAmount(filteredTotal)}
                    </Text>
                    <Text style={{ color: c.TEXT_SECONDARY, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                      {t.transaction.paymentsCount(filteredCount)}
                    </Text>
                  </View>
                  <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: `${c.ACCENT_CYAN}18`, borderWidth: 1, borderColor: `${c.ACCENT_CYAN}33`, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="stats-chart" size={22} color={c.ACCENT_CYAN} />
                  </View>
                </View>
                <View style={{ height: 1, backgroundColor: c.isDark ? 'rgba(255,255,255,0.08)' : c.BORDER, marginVertical: 16 }} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {(Object.entries(filteredBreakdown) as [Transaction['method'], { count: number; total: number }][]).map(([method, data]) => {
                    const b = METHOD[method];
                    return (
                      <View key={method} style={{ flex: 1, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: `${b.color}40`, backgroundColor: `${b.color}15` }}>
                        {b.logo ? (
                          <Image source={b.logo} style={{ width: 24, height: 24, marginBottom: 8 }} resizeMode="contain" />
                        ) : (
                          <Ionicons name="create-outline" size={24} color={b.color} style={{ marginBottom: 8 }} />
                        )}
                        <Text style={{ color: b.color, fontSize: 20, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' }}>{data.count}</Text>
                        <Text style={{ color: c.TEXT_SECONDARY, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 }}>{b.label}</Text>
                        <Text style={{ color: c.SUCCESS, fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginTop: 4 }}>{formatAmount(data.total)}</Text>
                      </View>
                    );
                  })}
                </View>
              </LinearGradient>
            </View>

            {/* Filter pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 16 }}>
              {(['all', ...monthGroups.map(g => g.key)] as string[]).map(key => {
                const active = filterKey === key;
                const label  = key === 'all' ? t.transaction.filterAll : `${MES_ABR[parseInt(key.split('-')[1])]} ${key.split('-')[0]}`;
                const count  = key === 'all' ? allPayerTxns.length : (monthGroups.find(g => g.key === key)?.txns.length ?? 0);
                return (
                  <TouchableOpacity key={key} onPress={() => setFilterKey(key)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, backgroundColor: active ? c.ACCENT_PURPLE : c.BACKGROUND_CARD_2, borderColor: active ? c.ACCENT_PURPLE : c.BORDER }}>
                    {active && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.8)' }} />}
                    <Text style={{ color: active ? '#fff' : c.TEXT_SECONDARY, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{label}</Text>
                    <View style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : c.BORDER, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: active ? '#fff' : c.TEXT_SECONDARY, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>{count}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Month groups */}
            {visibleGroups.map(group => {
              const isCollapsed = collapsed.has(group.key);
              const pct = totalFromPayer > 0 ? (group.subtotal / totalFromPayer) * 100 : 0;
              return (
                <View key={group.key} style={{ marginBottom: 8 }}>
                  <TouchableOpacity onPress={() => toggleGroup(group.key)} activeOpacity={0.75}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: c.BACKGROUND_CARD_2, marginHorizontal: 20, borderRadius: 16, borderWidth: 1, borderColor: c.BORDER, marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: c.TEXT_PRIMARY, fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>{MES_FULL[group.month]} {group.year}</Text>
                        <View style={{ backgroundColor: `${c.ACCENT_PURPLE}40`, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
                          <Text style={{ color: c.ACCENT_PURPLE, fontSize: 11, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>{group.txns.length}</Text>
                        </View>
                      </View>
                      <View style={{ height: 3, backgroundColor: c.BORDER, borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${pct}%`, backgroundColor: c.ACCENT_CYAN, borderRadius: 2 }} />
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                      <Text style={{ color: c.SUCCESS, fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>{formatAmount(group.subtotal)}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <Text style={{ color: c.TEXT_SECONDARY, fontSize: 11, fontFamily: 'Inter_400Regular' }}>{t.transaction.percentOfTotal(Math.round(pct))}</Text>
                        <Ionicons name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={14} color={c.TEXT_SECONDARY} />
                      </View>
                    </View>
                  </TouchableOpacity>

                  {!isCollapsed && (
                    <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
                      <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, paddingHorizontal: 14, overflow: 'hidden' }}>
                        {group.txns.map((txn, i) => (
                          <ModalTxnRow key={txn.id} txn={txn} noBorder={i === group.txns.length - 1} />
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

            {visibleGroups.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 60, gap: 12 }}>
                <Ionicons name="receipt-outline" size={44} color={c.TEXT_SECONDARY} />
                <Text style={{ color: c.TEXT_SECONDARY, fontSize: 15, fontFamily: 'Inter_400Regular' }}>{t.common.noPaymentsInPeriod}</Text>
              </View>
            )}

          </ScrollView>
        </View>
      </Modal>

      {/* ══ FALLBACK: no mail app configured ══ */}
      <Modal visible={supportModal} transparent animationType="fade" onRequestClose={() => setSupportModal(false)} statusBarTranslucent navigationBarTranslucent>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(6,6,10,0.82)', padding: 32 }}>
          <View style={{ width: '100%', backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, padding: 24 }}>
            <Text style={{ color: c.TEXT_PRIMARY, fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 8 }}>
              {t.transaction.noMailApp.title}
            </Text>
            <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20, marginBottom: 16 }}>
              {t.transaction.noMailApp.description}
            </Text>
            <View style={{ backgroundColor: c.BACKGROUND_CARD_2, borderRadius: 14, borderWidth: 1, borderColor: c.BORDER, padding: 14, marginBottom: 20 }}>
              <Text selectable style={{ color: c.ACCENT_CYAN, fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold', textAlign: 'center' }}>
                {SUPPORT_EMAIL}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSupportModal(false)} activeOpacity={0.85}
              style={{ height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.BACKGROUND_CARD_2, borderWidth: 1, borderColor: c.BORDER }}>
              <Text style={{ color: c.TEXT_PRIMARY, fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>{t.common.actions.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}
