import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../constants/theme';
import { PaymentColors } from '../../constants/colors';
import { Store } from '../../mocks/stores';
import { formatAmount, PaymentMethod } from '../../mocks/transactions';
import { useStores, useTeam } from '../../store/StoresStore';
import { useTransactions } from '../../store/PaymentsStore';
import { computeStoreRevenue, StoreRevenue } from '../../services/storeRevenue';
import { useTopInset } from '../../hooks/useTopInset';
import Avatar from '../../components/ui/Avatar';
import Input from '../../components/ui/Input';
import ThemeToggle from '../../components/ui/ThemeToggle';

const METHOD_LOGOS = {
  yape:   require('../../assets/images/brands/yape.png'),
  plin:   require('../../assets/images/brands/plin.png'),
  izipay: require('../../assets/images/brands/izipay.png'),
};

const ALL_METHODS: PaymentMethod[] = ['yape', 'plin', 'izipay'];
const METHOD_LABELS: Record<PaymentMethod, string> = { yape: 'Yape', plin: 'Plin', izipay: 'Izipay' };

const EMPTY_REVENUE: StoreRevenue = { todayRevenue: 0, monthRevenue: 0, txnCount: 0 };

function StoreCard({ store, revenue, onPress }: { store: Store; revenue: StoreRevenue; onPress: () => void }) {
  const { c } = useTheme();
  const isActive = store.status === 'active';
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={[styles.storeCard, { backgroundColor: c.BACKGROUND_CARD, borderColor: c.BORDER }]}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
        <View style={[styles.storeIcon, { backgroundColor: `${c.ACCENT_PURPLE}18`, borderColor: `${c.ACCENT_PURPLE}30` }]}>
          <Ionicons name="business-outline" size={22} color={c.ACCENT_PURPLE} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.storeName, { color: c.TEXT_PRIMARY }]}>{store.name}</Text>
          <Text style={[styles.storeAddr, { color: c.TEXT_SECONDARY }]} numberOfLines={1}>{store.address || 'Sin dirección'}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: isActive ? `${c.SUCCESS}20` : `${c.WARNING}20`, borderColor: isActive ? `${c.SUCCESS}44` : `${c.WARNING}44` }]}>
          <View style={[styles.statusDot, { backgroundColor: isActive ? c.SUCCESS : c.WARNING }]} />
          <Text style={[styles.statusText, { color: isActive ? c.SUCCESS : c.WARNING }]}>
            {isActive ? 'Activa' : 'Inactiva'}
          </Text>
        </View>
      </View>

      {/* Revenue stats */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
        <View style={[styles.statBox, { backgroundColor: c.BACKGROUND_CARD_2, borderColor: c.BORDER }]}>
          <Text style={[styles.statLabel, { color: c.TEXT_SECONDARY }]}>Hoy</Text>
          <Text style={[styles.statValue, { color: c.SUCCESS }]}>{formatAmount(revenue.todayRevenue)}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: c.BACKGROUND_CARD_2, borderColor: c.BORDER }]}>
          <Text style={[styles.statLabel, { color: c.TEXT_SECONDARY }]}>Este mes</Text>
          <Text style={[styles.statValue, { color: c.TEXT_PRIMARY }]}>{formatAmount(revenue.monthRevenue)}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: c.BACKGROUND_CARD_2, borderColor: c.BORDER }]}>
          <Text style={[styles.statLabel, { color: c.TEXT_SECONDARY }]}>Pagos</Text>
          <Text style={[styles.statValue, { color: c.TEXT_PRIMARY }]}>{revenue.txnCount}</Text>
        </View>
      </View>

      {/* Footer: account + methods */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="person-circle-outline" size={14} color={c.TEXT_SECONDARY} />
          <Text style={[styles.accountText, { color: c.TEXT_SECONDARY }]}>{store.account || 'Sin cuenta'}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {store.methods.map(m => (
            <View key={m} style={[styles.methodBadge, { backgroundColor: `${PaymentColors[m]}18`, borderColor: `${PaymentColors[m]}33` }]}>
              <Image source={METHOD_LOGOS[m]} style={{ width: 14, height: 14 }} resizeMode="contain" />
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

interface StoreFormData {
  name: string;
  address: string;
  account: string;
  methods: PaymentMethod[];
  status: 'active' | 'inactive';
}

function StoreFormSheet({ visible, onClose, initial, onSubmit, title }: {
  visible: boolean;
  onClose: () => void;
  initial: Store | null;
  onSubmit: (data: StoreFormData) => void;
  title: string;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [account, setAccount] = useState('');
  const [methods, setMethods] = useState<PaymentMethod[]>(['yape']);

  useEffect(() => {
    if (!visible) return;
    setName(initial?.name ?? '');
    setAddress(initial?.address ?? '');
    setAccount(initial?.account ?? '');
    setMethods(initial?.methods ?? ['yape']);
  }, [visible, initial]);

  function toggleMethod(m: PaymentMethod) {
    setMethods(prev => (prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]));
  }

  function handleSubmit() {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), address: address.trim(), account: account.trim(), methods, status: initial?.status ?? 'active' });
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={[styles.addSheet, { backgroundColor: c.BACKGROUND_CARD, paddingBottom: insets.bottom + 20 }]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={[styles.sheetHandle, { backgroundColor: c.BORDER }]} />
            <Text style={[styles.sheetTitle, { color: c.TEXT_PRIMARY }]}>{title}</Text>
            <View style={{ gap: 4 }}>
              <Input label="Nombre" placeholder="Tienda Principal" value={name} onChangeText={setName} leftIcon="business-outline" />
              <View style={{ height: 8 }} />
              <Input label="Dirección" placeholder="Jr. Comercio 123" value={address} onChangeText={setAddress} leftIcon="location-outline" />
              <View style={{ height: 8 }} />
              <Input label="Cuenta de notificaciones" placeholder="tienda@negocio.com" value={account} onChangeText={setAccount} keyboardType="email-address" leftIcon="mail-outline" />
            </View>
            <Text style={[styles.detailSectionLabel, { color: c.TEXT_SECONDARY, marginTop: 20, marginBottom: 10 }]}>Métodos de pago</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {ALL_METHODS.map(m => {
                const active = methods.includes(m);
                const color = PaymentColors[m];
                return (
                  <TouchableOpacity key={m} onPress={() => toggleMethod(m)} activeOpacity={0.8}
                    style={{ flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, backgroundColor: active ? `${color}18` : c.BACKGROUND_CARD_2, borderColor: active ? `${color}55` : c.BORDER }}>
                    <Image source={METHOD_LOGOS[m]} style={{ width: 26, height: 26, opacity: active ? 1 : 0.4 }} resizeMode="contain" />
                    <Text style={{ color: active ? color : c.TEXT_SECONDARY, fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginTop: 6 }}>
                      {METHOD_LABELS[m]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={handleSubmit} disabled={!name.trim()}
              style={{ marginTop: 24, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: name.trim() ? c.ACCENT_PURPLE : c.BORDER }}>
              <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>Guardar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}
              style={{ marginTop: 10, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.BACKGROUND_CARD_2, borderWidth: 1, borderColor: c.BORDER }}>
              <Text style={{ color: c.TEXT_PRIMARY, fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function StoresScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();
  const { stores, addStore, updateStore, removeStore } = useStores();
  const { team } = useTeam();
  const { transactions } = useTransactions();

  const [addModal, setAddModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const selectedStore = stores.find(s => s.id === selectedStoreId) ?? null;

  const revenueByStore = useMemo(() => {
    const map: Record<string, StoreRevenue> = {};
    stores.forEach(s => { map[s.id] = computeStoreRevenue(transactions, s.id); });
    return map;
  }, [stores, transactions]);

  const totalToday  = Object.values(revenueByStore).reduce((s, r) => s + r.todayRevenue, 0);
  const totalMonth  = Object.values(revenueByStore).reduce((s, r) => s + r.monthRevenue, 0);
  const activeCount = stores.filter(s => s.status === 'active').length;

  function handleDelete(store: Store) {
    if (stores.length <= 1) {
      Alert.alert('No se puede eliminar', 'Debe existir al menos una tienda.');
      return;
    }
    Alert.alert('Eliminar tienda', `¿Eliminar "${store.name}"? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { removeStore(store.id); setSelectedStoreId(null); } },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.BACKGROUND_DARK }}>
      <StatusBar style={c.isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 16, borderBottomColor: c.BORDER }]}>
        <View>
          <Text style={[styles.headerTitle, { color: c.TEXT_PRIMARY }]}>Mis tiendas</Text>
          <Text style={[styles.headerSub, { color: c.TEXT_SECONDARY }]}>{activeCount} activas · {stores.length} total</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
          <TouchableOpacity onPress={() => setAddModal(true)}
            style={[styles.addBtn, { backgroundColor: c.ACCENT_PURPLE }]}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>

        {/* Combined stats card */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, marginBottom: 20 }}>
          <LinearGradient colors={c.CARD_GRADIENT} style={[styles.summaryCard, { borderColor: `${c.ACCENT_PURPLE}30` }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <View>
                <Text style={[styles.summaryLabel, { color: c.TEXT_SECONDARY }]}>Total consolidado hoy</Text>
                <Text style={[styles.summaryAmount, { color: c.TEXT_PRIMARY }]}>{formatAmount(totalToday)}</Text>
                <Text style={[styles.summaryMonth, { color: c.TEXT_SECONDARY }]}>
                  {formatAmount(totalMonth)} este mes
                </Text>
              </View>
              <View style={[styles.summaryIcon, { backgroundColor: `${c.ACCENT_CYAN}18`, borderColor: `${c.ACCENT_CYAN}33` }]}>
                <Ionicons name="globe-outline" size={22} color={c.ACCENT_CYAN} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[
                { label: 'Tiendas activas', value: String(activeCount), icon: 'business-outline' as const },
                { label: 'Pagos hoy', value: String(Object.values(revenueByStore).reduce((s, r) => s + r.txnCount, 0)), icon: 'receipt-outline' as const },
                { label: 'Equipo', value: String(team.length), icon: 'people-outline' as const },
              ].map(stat => (
                <View key={stat.label} style={[styles.miniStat, { backgroundColor: c.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderColor: c.BORDER }]}>
                  <Ionicons name={stat.icon} size={16} color={c.ACCENT_PURPLE} />
                  <Text style={[styles.miniStatVal, { color: c.TEXT_PRIMARY }]}>{stat.value}</Text>
                  <Text style={[styles.miniStatLabel, { color: c.TEXT_SECONDARY }]}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>

        {/* Section label */}
        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, { color: c.TEXT_SECONDARY }]}>Tiendas</Text>
        </View>

        {/* Store cards */}
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {stores.map(store => (
            <StoreCard key={store.id} store={store} revenue={revenueByStore[store.id] ?? EMPTY_REVENUE} onPress={() => setSelectedStoreId(store.id)} />
          ))}
        </View>

      </ScrollView>

      {/* Store detail modal */}
      <Modal visible={!!selectedStore} animationType="slide" onRequestClose={() => setSelectedStoreId(null)}>
        {selectedStore && (
          <View style={{ flex: 1, backgroundColor: c.BACKGROUND_DARK }}>
            <StatusBar style={c.isDark ? 'light' : 'dark'} />
            <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: c.BORDER }]}>
              <TouchableOpacity onPress={() => setSelectedStoreId(null)} style={[styles.backBtn, { backgroundColor: c.BACKGROUND_CARD_2, borderColor: c.BORDER }]}>
                <Ionicons name="arrow-back" size={20} color={c.TEXT_PRIMARY} />
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.headerTitle, { color: c.TEXT_PRIMARY }]}>{selectedStore.name}</Text>
                <Text style={[styles.headerSub, { color: c.TEXT_SECONDARY }]}>{selectedStore.address || 'Sin dirección'}</Text>
              </View>
              <TouchableOpacity onPress={() => setEditingStore(selectedStore)} style={[styles.backBtn, { backgroundColor: c.BACKGROUND_CARD_2, borderColor: c.BORDER, marginRight: 8 }]}>
                <Ionicons name="pencil-outline" size={18} color={c.TEXT_PRIMARY} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(selectedStore)} style={[styles.backBtn, { backgroundColor: `${c.ACCENT_RED}18`, borderColor: `${c.ACCENT_RED}44` }]}>
                <Ionicons name="trash-outline" size={18} color={c.ACCENT_RED} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>

              {/* Account info */}
              <View style={[styles.detailCard, { backgroundColor: c.BACKGROUND_CARD, borderColor: c.BORDER }]}>
                <Text style={[styles.detailSectionLabel, { color: c.TEXT_SECONDARY }]}>Cuenta de notificaciones</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
                  <View style={[styles.accountIcon, { backgroundColor: `${c.ACCENT_CYAN}18` }]}>
                    <Ionicons name="mail-outline" size={18} color={c.ACCENT_CYAN} />
                  </View>
                  <Text style={[styles.accountEmail, { color: c.TEXT_PRIMARY }]}>{selectedStore.account || 'Sin asignar'}</Text>
                </View>
              </View>

              {/* Revenue */}
              <View style={[styles.detailCard, { backgroundColor: c.BACKGROUND_CARD, borderColor: c.BORDER, marginTop: 12 }]}>
                <Text style={[styles.detailSectionLabel, { color: c.TEXT_SECONDARY }]}>Ingresos</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                  {[
                    { label: 'Hoy', value: formatAmount((revenueByStore[selectedStore.id] ?? EMPTY_REVENUE).todayRevenue), color: c.SUCCESS },
                    { label: 'Este mes', value: formatAmount((revenueByStore[selectedStore.id] ?? EMPTY_REVENUE).monthRevenue), color: c.TEXT_PRIMARY },
                    { label: 'Pagos', value: String((revenueByStore[selectedStore.id] ?? EMPTY_REVENUE).txnCount), color: c.ACCENT_PURPLE },
                  ].map(item => (
                    <View key={item.label} style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ color: item.color, fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>{item.value}</Text>
                      <Text style={{ color: c.TEXT_SECONDARY, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 3 }}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Assigned team */}
              <Text style={[styles.sectionTitle, { color: c.TEXT_SECONDARY, marginTop: 20, marginBottom: 10 }]}>Equipo asignado</Text>
              {team.filter(m => m.storeId === selectedStore.id || m.storeId === 'all').map(member => (
                <View key={member.id} style={[styles.memberRow, { backgroundColor: c.BACKGROUND_CARD, borderColor: c.BORDER }]}>
                  <Avatar initials={member.initials} size="sm" color={c.ACCENT_PURPLE} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: c.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{member.name}</Text>
                    <Text style={{ color: c.TEXT_SECONDARY, fontSize: 12, fontFamily: 'Inter_400Regular' }}>{member.email}</Text>
                  </View>
                  <View style={[styles.rolePill, {
                    backgroundColor: member.role === 'owner' ? `${c.ACCENT_PURPLE}20` : member.role === 'supervisor' ? `${c.ACCENT_CYAN}20` : `${c.SUCCESS}20`,
                    borderColor: member.role === 'owner' ? `${c.ACCENT_PURPLE}44` : member.role === 'supervisor' ? `${c.ACCENT_CYAN}44` : `${c.SUCCESS}44`,
                  }]}>
                    <Text style={[styles.roleText, { color: member.role === 'owner' ? c.ACCENT_PURPLE : member.role === 'supervisor' ? c.ACCENT_CYAN : c.SUCCESS }]}>
                      {member.role === 'owner' ? 'Dueño' : member.role === 'supervisor' ? 'Supervisor' : 'Cajero'}
                    </Text>
                  </View>
                </View>
              ))}

              {/* Payment methods */}
              <Text style={[styles.sectionTitle, { color: c.TEXT_SECONDARY, marginTop: 20, marginBottom: 10 }]}>Métodos de pago</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {selectedStore.methods.map(m => (
                  <View key={m} style={[styles.methodCard, { backgroundColor: `${PaymentColors[m]}15`, borderColor: `${PaymentColors[m]}40` }]}>
                    <Image source={METHOD_LOGOS[m]} style={{ width: 32, height: 32 }} resizeMode="contain" />
                    <Text style={{ color: PaymentColors[m], fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginTop: 6 }}>
                      {METHOD_LABELS[m]}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Add store */}
      <StoreFormSheet
        visible={addModal}
        onClose={() => setAddModal(false)}
        initial={null}
        title="Agregar tienda"
        onSubmit={(data) => addStore(data)}
      />

      {/* Edit store */}
      <StoreFormSheet
        visible={!!editingStore}
        onClose={() => setEditingStore(null)}
        initial={editingStore}
        title="Editar tienda"
        onSubmit={(data) => { if (editingStore) updateStore(editingStore.id, data); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  headerSub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  summaryCard: { borderRadius: 24, padding: 22, borderWidth: 1 },
  summaryLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 6 },
  summaryAmount: { fontSize: 34, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', letterSpacing: -1, marginBottom: 2 },
  summaryMonth: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  summaryIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  miniStat: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1 },
  miniStatVal: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  miniStatLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  sectionTitle: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.2 },
  storeCard: { borderRadius: 20, padding: 18, borderWidth: 1 },
  storeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  storeName: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  storeAddr: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  statBox: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1 },
  statLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', marginBottom: 3 },
  statValue: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  accountText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  methodBadge: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  detailCard: { borderRadius: 18, padding: 16, borderWidth: 1 },
  detailSectionLabel: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1 },
  accountIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  accountEmail: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  memberRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, borderWidth: 1, marginBottom: 8 },
  rolePill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  roleText: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  methodCard: { borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, minWidth: 80 },
  addSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '88%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 16 },
});
