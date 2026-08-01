import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, StyleSheet, Dimensions, Image, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme, ThemeColors } from '../../constants/theme';
import { PaymentColors } from '../../constants/colors';
import { formatAmount, formatTime, formatDate, Transaction } from '../../mocks/transactions';
import { useTransactions } from '../../store/PaymentsStore';
import { useStores } from '../../store/StoresStore';
import { useAuth } from '../../store/AuthStore';
import { useTranslation } from '../../store/LocaleStore';
import { useTopInset } from '../../hooks/useTopInset';
import { useBottomSheet } from '../../store/BottomSheetStore';
import { ApiError } from '../../services/api';
import TransactionItem from '../../components/ui/TransactionItem';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import BrandLoader from '../../components/ui/BrandLoader';
import RefreshButton from '../../components/ui/RefreshButton';

// Local, device-time approximation of "today" — same convention already
// used by routeOptions() in app/modals/transaction/[id].tsx: the client only
// decides whether to SHOW the swipe gesture, the backend's Lima-timezone
// canRoute() is the real authority and re-checks everything.
function isTodayLocal(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

type Period = 'Hoy' | 'Día' | 'Semana' | 'Mes';

const { width: SW } = Dimensions.get('window');
const MONTH_CELL_W = Math.floor((SW - 48 - 30) / 4);

const METHOD_LOGOS: Record<'yape' | 'plin' | 'izipay', any> = {
  yape:   require('../../assets/images/brands/yape.png'),
  plin:   require('../../assets/images/brands/plin.png'),
  izipay: require('../../assets/images/brands/izipay.png'),
};
const METHOD_LABELS: Record<Transaction['method'], string> = { yape: 'Yape', plin: 'Plin', izipay: 'Izipay', manual: 'Manual' };

function businessInitials(name: string | undefined): string {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';
}

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }

function weeksOf(y: number, m: number) {
  const total = daysInMonth(y, m);
  const ws: { n: number; s: number; e: number }[] = [];
  let s = 1;
  while (s <= total) { ws.push({ n: ws.length + 1, s, e: Math.min(s + 6, total) }); s += 7; }
  return ws;
}

interface Sel {
  diaY: number; diaM: number; diaD: number;
  semY: number; semM: number; semN: number; semS: number; semE: number;
  mesY: number; mesM: number;
}

function filtrar(txns: Transaction[], p: Period, sel: Sel, hoy: Date): Transaction[] {
  if (p === 'Hoy') {
    const ini = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
    return txns.filter(t => t.timestamp >= ini && t.timestamp < fin);
  }
  if (p === 'Día') {
    const ini = new Date(sel.diaY, sel.diaM, sel.diaD);
    const fin = new Date(sel.diaY, sel.diaM, sel.diaD + 1);
    return txns.filter(t => t.timestamp >= ini && t.timestamp < fin);
  }
  if (p === 'Semana') {
    const ini = new Date(sel.semY, sel.semM, sel.semS);
    const fin = new Date(sel.semY, sel.semM, sel.semE + 1);
    return txns.filter(t => t.timestamp >= ini && t.timestamp < fin);
  }
  const ini = new Date(sel.mesY, sel.mesM, 1);
  const fin = new Date(sel.mesY, sel.mesM + 1, 1);
  return txns.filter(t => t.timestamp >= ini && t.timestamp < fin);
}

function labelPeriodo(p: Period, sel: Sel, hoy: Date, abr: string[], full: string[], weekAbbr: string) {
  if (p === 'Hoy')    return `${hoy.getDate()} ${full[hoy.getMonth()]} ${hoy.getFullYear()}`;
  if (p === 'Día')    return `${sel.diaD} ${full[sel.diaM]} ${sel.diaY}`;
  if (p === 'Semana') return `${weekAbbr} ${sel.semN}: ${sel.semS} ${abr[sel.semM]} – ${sel.semE} ${abr[sel.semM]} ${sel.semY}`;
  return `${full[sel.mesM]} ${sel.mesY}`;
}

function VerTodosRow({ txn, onPress, storeName }: { txn: Transaction; onPress: () => void; storeName?: string | null }) {
  const { c } = useTheme();
  const t = useTranslation();
  const color = PaymentColors[txn.method];
  const isVoided = txn.status === 'voided';
  const isEdited = txn.amount !== txn.originalAmount;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}>
      <Avatar initials={txn.payerInitials} size="md" color={color} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: c.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
          {txn.payerName}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
          {txn.method === 'manual' ? (
            <Ionicons name="create-outline" size={13} color={color} />
          ) : (
            <Image source={METHOD_LOGOS[txn.method]} style={{ width: 13, height: 13, borderRadius: 3 }} resizeMode="contain" />
          )}
          <Text style={{ color, fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
            {METHOD_LABELS[txn.method]}
          </Text>
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 12 }}>·</Text>
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 11, fontFamily: 'Inter_400Regular' }}>{txn.reference}</Text>
        </View>
        {!!storeName && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 }}>
            <Ionicons name="business-outline" size={10} color={c.TEXT_SECONDARY} />
            <Text style={{ color: c.TEXT_SECONDARY, fontSize: 10, fontFamily: 'Inter_400Regular' }} numberOfLines={1}>{storeName}</Text>
          </View>
        )}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={{
          color: isVoided ? c.TEXT_SECONDARY : c.SUCCESS, fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold',
          textDecorationLine: isVoided ? 'line-through' : 'none',
        }}>
          {formatAmount(txn.amount)}
        </Text>
        <Text style={{ color: c.TEXT_SECONDARY, fontSize: 10, fontFamily: 'Inter_400Regular' }}>
          {formatDate(txn.timestamp)}  {formatTime(txn.timestamp)}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {isEdited && <Ionicons name="pencil" size={10} color={c.WARNING} />}
          {isVoided && <Badge label={t.transaction.voided} variant="error" size="sm" />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function PeriodPickerSheet({ periodo, initial, hoy, onClose, onSelectDia, onSelectSemana, onSelectMes }: {
  periodo: 'Día' | 'Semana' | 'Mes';
  initial: Sel;
  hoy: Date;
  onClose: () => void;
  onSelectDia: (y: number, m: number, d: number) => void;
  onSelectSemana: (y: number, m: number, n: number, s: number, e: number) => void;
  onSelectMes: (y: number, m: number) => void;
}) {
  const { c: Colors } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useTranslation();
  const ABR = t.common.months.abbr;
  const FULL = t.common.months.full;

  const [navY, setNavY] = useState(periodo === 'Día' ? initial.diaY : periodo === 'Semana' ? initial.semY : initial.mesY);
  const [navM, setNavM] = useState(periodo === 'Día' ? initial.diaM : periodo === 'Semana' ? initial.semM : initial.mesM);
  const [tempDia, setTempDia] = useState(initial.diaD);

  function prevMes() { if (navM === 0) { setNavM(11); setNavY(y => y - 1); } else setNavM(m => m - 1); }
  function nextMes() { if (navM === 11) { setNavM(0); setNavY(y => y + 1); } else setNavM(m => m + 1); }

  const semanas = weeksOf(navY, navM);
  const totalDias = daysInMonth(navY, navM);

  return (
    <View style={{
      backgroundColor: Colors.BACKGROUND_CARD, borderTopLeftRadius: 32, borderTopRightRadius: 20,
      padding: 24, paddingBottom: insets.bottom + 24, borderTopWidth: 1, borderColor: Colors.BORDER,
      shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 24,
    }}>
      <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.BORDER, alignSelf: 'center', marginBottom: 20 }} />
      <Text style={{ color: Colors.TEXT_PRIMARY, fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 16 }}>
        {periodo === 'Día' ? t.dashboard.picker.selectDay : periodo === 'Semana' ? t.dashboard.picker.selectWeek : t.dashboard.picker.selectMonth}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <TouchableOpacity onPress={periodo === 'Mes' ? () => setNavY(y => y - 1) : prevMes}
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.BACKGROUND_CARD_2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.BORDER }}>
          <Ionicons name="chevron-back" size={20} color={Colors.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={{ color: Colors.TEXT_PRIMARY, fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
          {periodo === 'Mes' ? `${navY}` : `${FULL[navM]} ${navY}`}
        </Text>
        <TouchableOpacity onPress={periodo === 'Mes' ? () => setNavY(y => y + 1) : nextMes}
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.BACKGROUND_CARD_2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.BORDER }}>
          <Ionicons name="chevron-forward" size={20} color={Colors.TEXT_PRIMARY} />
        </TouchableOpacity>
      </View>

      {periodo === 'Día' && (
        <View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {Array.from({ length: totalDias }, (_, i) => i + 1).map(d => {
              const isSel = tempDia === d;
              const esHoy = d === hoy.getDate() && navM === hoy.getMonth() && navY === hoy.getFullYear();
              return (
                <TouchableOpacity key={d} onPress={() => setTempDia(d)}
                  style={{
                    width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isSel ? Colors.ACCENT_PURPLE : Colors.BACKGROUND_CARD_2,
                    borderWidth: 1, borderColor: isSel ? Colors.ACCENT_PURPLE : esHoy ? Colors.ACCENT_CYAN : Colors.BORDER,
                  }}>
                  <Text style={{
                    color: isSel ? '#fff' : esHoy ? Colors.ACCENT_CYAN : Colors.TEXT_PRIMARY,
                    fontSize: 14, fontFamily: isSel ? 'Inter_700Bold' : 'Inter_400Regular',
                  }}>
                    {d}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            onPress={() => onSelectDia(navY, navM, tempDia)}
            style={{ marginTop: 16, backgroundColor: Colors.ACCENT_PURPLE, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
              {t.dashboard.picker.viewDay(tempDia, FULL[navM], navY)}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {periodo === 'Semana' && (
        <View style={{ gap: 8, marginTop: 8 }}>
          {semanas.map(w => {
            const selW = initial.semN === w.n && initial.semM === navM && initial.semY === navY;
            return (
              <TouchableOpacity key={w.n}
                onPress={() => onSelectSemana(navY, navM, w.n, w.s, w.e)}
                style={{
                  flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, borderWidth: 1,
                  backgroundColor: selW ? Colors.ACCENT_PURPLE : Colors.BACKGROUND_CARD_2,
                  borderColor: selW ? Colors.ACCENT_PURPLE : Colors.BORDER,
                }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: selW ? '#fff' : Colors.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
                    {t.dashboard.picker.weekN(w.n)}
                  </Text>
                  <Text style={{ color: selW ? 'rgba(255,255,255,0.75)' : Colors.TEXT_SECONDARY, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                    {w.s} {ABR[navM]} – {w.e} {ABR[navM]} {navY}
                  </Text>
                </View>
                {selW && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {periodo === 'Mes' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
          {FULL.map((_, i) => {
            const isSel = initial.mesM === i && initial.mesY === navY;
            const esHoy = i === hoy.getMonth() && navY === hoy.getFullYear();
            return (
              <TouchableOpacity key={i}
                onPress={() => onSelectMes(navY, i)}
                style={{
                  width: MONTH_CELL_W, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: isSel ? Colors.ACCENT_PURPLE : Colors.BACKGROUND_CARD_2,
                  borderWidth: 1, borderColor: isSel ? Colors.ACCENT_PURPLE : esHoy ? Colors.ACCENT_CYAN : Colors.BORDER,
                }}>
                <Text style={{
                  color: isSel ? '#fff' : esHoy ? Colors.ACCENT_CYAN : Colors.TEXT_PRIMARY,
                  fontSize: 14, fontFamily: isSel ? 'Inter_700Bold' : 'Inter_400Regular',
                }}>
                  {ABR[i]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function DashboardScreen() {
  const { c: Colors, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = useTopInset(20);
  const t = useTranslation();
  const ABR = t.common.months.abbr;
  const FULL = t.common.months.full;
  const PERIOD_LABEL: Record<Period, string> = {
    Hoy: t.dashboard.periods.today,
    Día: t.dashboard.periods.day,
    Semana: t.dashboard.periods.week,
    Mes: t.dashboard.periods.month,
  };
  const hoy = new Date();

  const [periodo, setPeriodo]         = useState<Period>('Hoy');
  const [verTodos, setVerTodos]       = useState(false);
  const { transactions: allTxns, transactionsLoading, routeTransaction, refreshTransactions, fetchGeneralPool } = useTransactions();
  const { stores } = useStores();
  const { user } = useAuth();
  const { present, dismiss } = useBottomSheet();

  // GET /transactions (allTxns) only ever returns already-assigned payments
  // — a payment captured by the notification listener lands in GENERAL
  // first and stays invisible here until someone routes it to a store. That
  // silence read as "the app isn't picking up the notification" even though
  // it had, so "Hoy" additionally pulls in the GENERAL pool directly —
  // "Pagos sin asignar" (general.tsx) still owns actually routing them.
  const [generalPool, setGeneralPool] = useState<Transaction[]>([]);

  const loadGeneralPool = useCallback(async () => {
    try {
      setGeneralPool(await fetchGeneralPool());
    } catch {
      // Silent — the assigned-only list above still loads and renders fine
      // without it; a failed GENERAL fetch just means today's total may
      // under-count unassigned payments until the next refresh succeeds.
    }
  }, [fetchGeneralPool]);

  useEffect(() => { loadGeneralPool(); }, [loadGeneralPool]);

  function storeNameFor(storeId: string | null): string | null {
    if (storeId === null) return t.common.generalPoolLabel;
    return stores.find(s => s.id === storeId)?.name ?? null;
  }

  async function handleReturnToGeneral(txn: Transaction) {
    try {
      await routeTransaction(txn.id, null, txn.version);
      await refreshTransactions();
    } catch (e) {
      Alert.alert('', e instanceof ApiError ? e.message : t.general.loadError);
    }
  }

  async function handleRefreshAll() {
    await Promise.all([refreshTransactions(), loadGeneralPool()]);
  }

  const [sel, setSel] = useState<Sel>({
    diaY: hoy.getFullYear(), diaM: hoy.getMonth(), diaD: hoy.getDate(),
    semY: hoy.getFullYear(), semM: hoy.getMonth(), semN: 1, semS: 1, semE: 7,
    mesY: hoy.getFullYear(), mesM: hoy.getMonth(),
  });

  // Only "Hoy" folds in the GENERAL pool — Día/Semana/Mes stay assigned-only
  // store-level reporting, same as before. allTxns and generalPool come
  // from two independently-timed fetches, so a payment that got routed to a
  // store in the gap between them can briefly show up in BOTH — dedupe by
  // id and keep the allTxns (assigned) copy, since it's the more current one.
  const baseTxns = useMemo(() => {
    if (periodo !== 'Hoy') return allTxns;
    const assignedIds = new Set(allTxns.map(t => t.id));
    const stillUnassigned = generalPool.filter(t => !assignedIds.has(t.id));
    return [...allTxns, ...stillUnassigned];
  }, [allTxns, generalPool, periodo]);
  const txnsAll  = useMemo(() => filtrar(baseTxns, periodo, sel, hoy), [baseTxns, periodo, sel]);
  const txns     = periodo === 'Hoy' ? txnsAll.slice(0, 10) : txnsAll;
  const total    = txnsAll.reduce((s, t) => s + t.amount, 0);

  const breakdown = useMemo(() => {
    const out: Partial<Record<Transaction['method'], { count: number; total: number }>> = {};
    txnsAll.forEach(t => {
      if (!out[t.method]) out[t.method] = { count: 0, total: 0 };
      out[t.method]!.count++;
      out[t.method]!.total += t.amount;
    });
    return out;
  }, [txnsAll]);

  function abrirPicker(p: Period) {
    if (p === 'Hoy') { setPeriodo('Hoy'); return; }
    setPeriodo(p);
    present(
      <PeriodPickerSheet
        periodo={p}
        initial={sel}
        hoy={hoy}
        onClose={dismiss}
        onSelectDia={(y, m, d) => { setSel(v => ({ ...v, diaY: y, diaM: m, diaD: d })); dismiss(); }}
        onSelectSemana={(y, m, n, s, e) => { setSel(v => ({ ...v, semY: y, semM: m, semN: n, semS: s, semE: e })); dismiss(); }}
        onSelectMes={(y, m) => { setSel(v => ({ ...v, mesY: y, mesM: m })); dismiss(); }}
      />
    );
  }

  const label = labelPeriodo(periodo, sel, hoy, ABR, FULL, t.dashboard.weekAbbr);

  function goToDetail(txnId: string) {
    setVerTodos(false);
    setTimeout(() => router.push(`/modals/transaction/${txnId}`), 200);
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND_DARK }}>
      <StatusBar style={Colors.isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={{
        paddingTop: topInset, paddingHorizontal: 24, paddingBottom: 20,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar initials={businessInitials(user?.businessName)} size="md" color={Colors.ACCENT_PURPLE} />
          <View>
            <Text style={{ color: Colors.TEXT_SECONDARY, fontSize: 13, fontFamily: 'Inter_400Regular' }}>{t.dashboard.greeting}</Text>
            <Text style={{ color: Colors.TEXT_PRIMARY, fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>{user?.businessName ?? ''}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Theme toggle */}
          <TouchableOpacity onPress={toggle}
            style={{
              width: 42, height: 42, borderRadius: 14, backgroundColor: Colors.BACKGROUND_CARD_2,
              alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.BORDER,
            }}>
            <Ionicons name={Colors.isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={Colors.TEXT_PRIMARY} />
          </TouchableOpacity>
          {/* Bell */}
          <TouchableOpacity
            onPress={() => router.push('/(app)/notifications')}
            style={{
              width: 42, height: 42, borderRadius: 14, backgroundColor: Colors.BACKGROUND_CARD_2,
              alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.BORDER,
            }}>
            <Ionicons name="notifications-outline" size={20} color={Colors.TEXT_PRIMARY} />
            <View style={{
              position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4,
              backgroundColor: Colors.ACCENT_RED, borderWidth: 1.5, borderColor: Colors.BACKGROUND_DARK,
            }} />
          </TouchableOpacity>
          {/* Alert Center — hidden for cajero, who has no access to it at all */}
          {user?.role !== 'cajero' && (
            <TouchableOpacity
              onPress={() => router.push('/(app)/alert-center')}
              style={{
                width: 42, height: 42, borderRadius: 14, backgroundColor: Colors.BACKGROUND_CARD_2,
                alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.BORDER,
              }}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.TEXT_PRIMARY} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Stats card */}
        <View style={{ paddingHorizontal: 24, marginBottom: 28 }}>
          <LinearGradient
            colors={Colors.CARD_GRADIENT}
            style={{ borderRadius: 28, padding: 28, borderWidth: 1, borderColor: `${Colors.ACCENT_PURPLE}33` }}
          >
            <Text style={{ color: Colors.TEXT_SECONDARY, fontSize: 13, marginBottom: 8, fontFamily: 'Inter_400Regular' }}>
              {t.dashboard.totalReceived}
            </Text>
            <Text style={{
              color: Colors.TEXT_PRIMARY, fontSize: 40, fontWeight: '800',
              fontFamily: 'Inter_800ExtraBold', letterSpacing: -1, marginBottom: 4,
            }}>
              {formatAmount(total)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Ionicons name="trending-up" size={14} color={Colors.SUCCESS} />
              <Text style={{ color: Colors.SUCCESS, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
                {t.dashboard.transactionsCount(txnsAll.length)}
              </Text>
            </View>
            <Text style={{ color: Colors.TEXT_SECONDARY, fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 20 }}>
              {label}
            </Text>

            {/* 4 tabs */}
            <View style={{ flexDirection: 'row', backgroundColor: `${Colors.BACKGROUND_DARK}88`, borderRadius: 12, padding: 3 }}>
              {(['Hoy', 'Día', 'Semana', 'Mes'] as Period[]).map(p => (
                <TouchableOpacity
                  key={p}
                  onPress={() => abrirPicker(p)}
                  style={{
                    flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 10,
                    backgroundColor: periodo === p ? Colors.ACCENT_PURPLE : 'transparent',
                  }}
                >
                  <Text style={{
                    color: periodo === p ? '#fff' : Colors.TEXT_SECONDARY,
                    fontWeight: '600', fontSize: 12, fontFamily: 'Inter_600SemiBold',
                  }}>
                    {PERIOD_LABEL[p]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>
        </View>

        {/* Transaction list */}
        <View style={{ paddingHorizontal: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <Text style={{ color: Colors.TEXT_PRIMARY, fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>
              {periodo === 'Hoy' ? t.dashboard.recentPayments : t.dashboard.periodPayments}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <RefreshButton onRefresh={handleRefreshAll} size={30} />
              {txnsAll.length > 0 && (
                <TouchableOpacity onPress={() => setVerTodos(true)}>
                  <Text style={{ color: Colors.ACCENT_CYAN, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>{t.dashboard.viewAll}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {transactionsLoading ? (
            <BrandLoader />
          ) : txns.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48, gap: 12 }}>
              <Ionicons name="receipt-outline" size={40} color={Colors.TEXT_SECONDARY} />
              <Text style={{ color: Colors.TEXT_SECONDARY, fontSize: 15, fontFamily: 'Inter_400Regular' }}>
                {t.common.noPaymentsInPeriod}
              </Text>
            </View>
          ) : (
            txns.map(txn => (
              <TransactionItem
                key={txn.id}
                transaction={txn}
                onPress={() => router.push(`/modals/transaction/${txn.id}`)}
                storeName={storeNameFor(txn.storeId)}
                onReturnToGeneral={
                  user?.role === 'supervisor' && txn.storeId === user.storeId && isTodayLocal(txn.timestamp)
                    ? () => handleReturnToGeneral(txn)
                    : undefined
                }
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={{
          position: 'absolute', bottom: insets.bottom + 72, right: 20,
          width: 52, height: 52, borderRadius: 16, backgroundColor: Colors.ACCENT_PURPLE,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: Colors.ACCENT_PURPLE, shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
        }}
        onPress={() => router.push('/(app)/settings')}
      >
        <Ionicons name="settings-outline" size={22} color="#fff" />
      </TouchableOpacity>

      {/* ══ VER TODOS MODAL ══ */}
      <Modal visible={verTodos} animationType="slide" onRequestClose={() => setVerTodos(false)} statusBarTranslucent navigationBarTranslucent>
        <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND_DARK }}>
          <StatusBar style={Colors.isDark ? 'light' : 'dark'} />

          <View style={{
            flexDirection: 'row', alignItems: 'center',
            paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 16,
            borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
          }}>
            <TouchableOpacity onPress={() => setVerTodos(false)} style={{
              width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.BACKGROUND_CARD_2,
              alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.BORDER,
            }}>
              <Ionicons name="arrow-back" size={20} color={Colors.TEXT_PRIMARY} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ color: Colors.TEXT_PRIMARY, fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>{t.dashboard.allPayments}</Text>
              <Text style={{ color: Colors.TEXT_SECONDARY, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 1 }}>{label}</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>

            {/* Summary card */}
            <View style={{ paddingHorizontal: 20, paddingTop: 20, marginBottom: 8 }}>
              <LinearGradient colors={Colors.STATS_GRADIENT} style={{
                borderRadius: 24, padding: 22, borderWidth: 1, borderColor: `${Colors.ACCENT_PURPLE}40`,
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <View>
                    <Text style={{ color: Colors.TEXT_SECONDARY, fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 6 }}>
                      {t.dashboard.periodTotal}
                    </Text>
                    <Text style={{ color: Colors.TEXT_PRIMARY, fontSize: 34, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', letterSpacing: -1, marginBottom: 3 }}>
                      {formatAmount(total)}
                    </Text>
                    <Text style={{ color: Colors.TEXT_SECONDARY, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                      {t.dashboard.paymentsCount(txnsAll.length)}
                    </Text>
                  </View>
                  <View style={{
                    width: 48, height: 48, borderRadius: 16, backgroundColor: `${Colors.ACCENT_CYAN}18`,
                    borderWidth: 1, borderColor: `${Colors.ACCENT_CYAN}33`, alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ionicons name="wallet-outline" size={22} color={Colors.ACCENT_CYAN} />
                  </View>
                </View>

                {Object.keys(breakdown).length > 0 && (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {(Object.entries(breakdown) as [Transaction['method'], { count: number; total: number }][]).map(([method, data]) => {
                      const color = PaymentColors[method];
                      return (
                        <View key={method} style={{ flex: 1, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: `${color}40`, backgroundColor: `${color}15` }}>
                          {method === 'manual' ? (
                            <Ionicons name="create-outline" size={22} color={color} style={{ marginBottom: 6 }} />
                          ) : (
                            <Image source={METHOD_LOGOS[method]} style={{ width: 22, height: 22, marginBottom: 6 }} resizeMode="contain" />
                          )}
                          <Text style={{ color, fontSize: 20, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' }}>{data.count}</Text>
                          <Text style={{ color: Colors.TEXT_SECONDARY, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 }}>{METHOD_LABELS[method]}</Text>
                          <Text style={{ color: Colors.SUCCESS, fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginTop: 4 }}>{formatAmount(data.total)}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </LinearGradient>
            </View>

            <View style={{ paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: Colors.TEXT_SECONDARY, fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                {t.dashboard.transactionsLabel}
              </Text>
              <Text style={{ color: Colors.TEXT_SECONDARY, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                {t.dashboard.resultsCount(txnsAll.length)}
              </Text>
            </View>

            <View style={{ paddingHorizontal: 20 }}>
              {txnsAll.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 48, gap: 12 }}>
                  <Ionicons name="receipt-outline" size={40} color={Colors.TEXT_SECONDARY} />
                  <Text style={{ color: Colors.TEXT_SECONDARY, fontSize: 15, fontFamily: 'Inter_400Regular' }}>
                    Sin pagos en este período
                  </Text>
                </View>
              ) : (
                <View style={{ backgroundColor: Colors.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: Colors.BORDER, paddingHorizontal: 16, overflow: 'hidden' }}>
                  {txnsAll.map((txn, i) => (
                    <View key={txn.id} style={i < txnsAll.length - 1 ? { borderBottomWidth: 1, borderBottomColor: Colors.BORDER } : undefined}>
                      <VerTodosRow txn={txn} onPress={() => goToDetail(txn.id)} storeName={storeNameFor(txn.storeId)} />
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}
