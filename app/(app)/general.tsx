import { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, Image, Alert, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../constants/theme';
import { PaymentColors } from '../../constants/colors';
import { formatAmount, formatDate, formatTime, Transaction } from '../../mocks/transactions';
import { useTransactions } from '../../store/PaymentsStore';
import { useStores } from '../../store/StoresStore';
import { useAuth } from '../../store/AuthStore';
import { useTranslation } from '../../store/LocaleStore';
import { ApiError } from '../../services/api';
import { useTopInset } from '../../hooks/useTopInset';
import Avatar from '../../components/ui/Avatar';
import BrandLoader from '../../components/ui/BrandLoader';
import EmptyState from '../../components/ui/EmptyState';

// A manually-entered payment always has a real storeId (POST
// /transactions/manual requires one), so it can never actually appear in
// this GENERAL-only screen — but `txn: Transaction` still types `method` as
// the full PaymentMethod, so these need a 'manual' entry for type safety
// even though it's unreachable here in practice.
const METHOD_LOGOS: Record<'yape' | 'plin' | 'izipay', any> = {
  yape:   require('../../assets/images/brands/yape.png'),
  plin:   require('../../assets/images/brands/plin.png'),
  izipay: require('../../assets/images/brands/izipay.png'),
};
const METHOD_LABELS: Record<string, string> = { yape: 'Yape', plin: 'Plin', izipay: 'Izipay', manual: 'Manual' };

function GeneralRow({ txn, onAssignMine, onAssignTo, canAssignMine, canPick, assigning }: {
  txn: Transaction;
  onAssignMine: () => void;
  onAssignTo: () => void;
  canAssignMine: boolean;
  canPick: boolean;
  assigning: boolean;
}) {
  const { c } = useTheme();
  const t = useTranslation();
  const color = PaymentColors[txn.method];

  // Swiping the row to the right reveals this left-side panel and, once
  // fully open, assigns the payment straight to the swiper's own store —
  // the requested "deslizar a la derecha" gesture. Only offered when there
  // IS a single unambiguous "my store" (cajero always has one; a supervisor
  // does too unless they oversee all stores, in which case only the picker
  // button below makes sense). The button stays as a discoverable fallback
  // for anyone who doesn't find the swipe.
  const renderLeftActions = canAssignMine
    ? (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
        const scale = dragX.interpolate({ inputRange: [0, 80], outputRange: [0.5, 1], extrapolate: 'clamp' });
        return (
          <View style={{ justifyContent: 'center', alignItems: 'flex-start', width: 96, marginBottom: 10 }}>
            <Animated.View style={{
              transform: [{ scale }], width: 88, height: '100%', borderRadius: 18,
              backgroundColor: c.SUCCESS, alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', fontFamily: 'Inter_700Bold', textAlign: 'center' }}>
                {t.general.assignToMine}
              </Text>
            </Animated.View>
          </View>
        );
      }
    : undefined;

  const card = (
    <TouchableOpacity
      onPress={() => router.push(`/modals/transaction/${txn.id}`)}
      activeOpacity={0.8}
      style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: c.BORDER }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Avatar initials={txn.payerInitials} size="md" color={color} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: c.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
            {txn.payerName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
            {txn.method === 'manual' ? (
              <Ionicons name="create-outline" size={13} color={color} />
            ) : (
              <Image source={METHOD_LOGOS[txn.method]} style={{ width: 13, height: 13, borderRadius: 3 }} resizeMode="contain" />
            )}
            <Text style={{ color, fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{METHOD_LABELS[txn.method]}</Text>
            <Text style={{ color: c.TEXT_SECONDARY, fontSize: 12 }}>·</Text>
            <Text style={{ color: c.TEXT_SECONDARY, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
              {formatDate(txn.timestamp)}  {formatTime(txn.timestamp)}
            </Text>
          </View>
        </View>
        <Text style={{ color: c.SUCCESS, fontSize: 16, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' }}>
          {formatAmount(txn.amount)}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        {canAssignMine && (
          <TouchableOpacity onPress={onAssignMine} disabled={assigning} activeOpacity={0.85}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 12, backgroundColor: `${c.SUCCESS}18`, borderWidth: 1, borderColor: `${c.SUCCESS}44`, opacity: assigning ? 0.6 : 1 }}>
            <Ionicons name="checkmark-circle-outline" size={16} color={c.SUCCESS} />
            <Text style={{ color: c.SUCCESS, fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{t.general.assignToMine}</Text>
          </TouchableOpacity>
        )}
        {canPick && (
          <TouchableOpacity onPress={onAssignTo} disabled={assigning} activeOpacity={0.85}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 12, backgroundColor: `${c.ACCENT_PURPLE}18`, borderWidth: 1, borderColor: `${c.ACCENT_PURPLE}44`, opacity: assigning ? 0.6 : 1 }}>
            <Ionicons name="business-outline" size={16} color={c.ACCENT_PURPLE} />
            <Text style={{ color: c.ACCENT_PURPLE, fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{t.general.assignTo}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  if (!canAssignMine) return card;

  return (
    <Swipeable renderLeftActions={renderLeftActions} onSwipeableOpen={() => { if (!assigning) onAssignMine(); }} overshootLeft={false}>
      {card}
    </Swipeable>
  );
}

export default function GeneralScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = useTopInset(20);
  const t = useTranslation();
  const { user } = useAuth();
  const { stores } = useStores();
  const { fetchGeneralPool, routeTransaction } = useTransactions();

  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [pickerTxn, setPickerTxn] = useState<Transaction | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setLoadError(false);
    try {
      const remote = await fetchGeneralPool();
      setItems(remote);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchGeneralPool]);

  useEffect(() => { load(); }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load(true);
  }

  async function assign(txn: Transaction, toStoreId: string) {
    setAssigningId(txn.id);
    try {
      await routeTransaction(txn.id, toStoreId, txn.version);
      setItems(prev => prev.filter(x => x.id !== txn.id));
      setPickerTxn(null);
    } catch (e) {
      Alert.alert('', e instanceof ApiError ? e.message : t.general.loadError);
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.BACKGROUND_DARK }}>
      <StatusBar style={c.isDark ? 'light' : 'dark'} />

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: topInset, paddingHorizontal: 24, paddingBottom: 20 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.TEXT_PRIMARY, fontSize: 22, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' }}>
            {t.general.headerTitle}
          </Text>
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
            {t.general.headerSubtitle(items.length)}
          </Text>
        </View>
        {user?.role === 'owner' && (
          <TouchableOpacity onPress={() => router.push('/(app)/manual-entry')}
            style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: c.ACCENT_PURPLE, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.ACCENT_PURPLE} />}
      >
        {loading ? (
          <BrandLoader />
        ) : loadError ? (
          <EmptyState icon="alert-circle-outline" title={t.general.loadError} />
        ) : items.length === 0 ? (
          <EmptyState icon="layers-outline" title={t.general.empty.title} description={t.general.empty.description} />
        ) : (
          items.map(txn => (
            <GeneralRow
              key={txn.id}
              txn={txn}
              assigning={assigningId === txn.id}
              canAssignMine={(user?.role === 'cajero' || user?.role === 'supervisor') && !!user.storeId}
              // Only the owner may send a GENERAL payment to a DIFFERENT
              // specific store — a supervisor may only send it to GENERAL
              // (nowhere to do that from here, it's already there) or to
              // their own store (the swipe/button above already covers
              // that), never to another store.
              canPick={user?.role === 'owner'}
              onAssignMine={() => { if (user?.storeId) assign(txn, user.storeId); }}
              onAssignTo={() => setPickerTxn(txn)}
            />
          ))
        )}
      </ScrollView>

      {/* Store picker for supervisor/owner */}
      <Modal visible={!!pickerTxn} transparent animationType="slide" onRequestClose={() => setPickerTxn(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: c.BACKGROUND_CARD, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: insets.bottom + 20 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.BORDER, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ color: c.TEXT_PRIMARY, fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 16 }}>
              {t.general.pickStoreTitle}
            </Text>
            <View style={{ gap: 8 }}>
              {stores.map(store => (
                <TouchableOpacity key={store.id} onPress={() => pickerTxn && assign(pickerTxn, store.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, borderWidth: 1, backgroundColor: c.BACKGROUND_CARD_2, borderColor: c.BORDER }}>
                  <Text style={{ flex: 1, color: c.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{store.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => setPickerTxn(null)}
              style={{ marginTop: 20, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.BACKGROUND_CARD_2, borderWidth: 1, borderColor: c.BORDER }}>
              <Text style={{ color: c.TEXT_PRIMARY, fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>{t.common.actions.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
