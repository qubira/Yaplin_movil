import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Share, Image,
  Modal, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { PaymentColors } from '../../../constants/colors';
import { useTheme } from '../../../constants/theme';
import { formatAmount, formatDate, formatTime, Transaction } from '../../../mocks/transactions';
import { useTransactions } from '../../../store/PaymentsStore';
import Avatar from '../../../components/ui/Avatar';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

const MES_ABR  = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const METHOD = {
  yape:   { label: 'Yape',   logo: require('../../../assets/images/brands/yape.png'),   color: PaymentColors.yape,   gradientColors: ['#2D1060','#1A0A3C'] as [string, string] },
  plin:   { label: 'Plin',   logo: require('../../../assets/images/brands/plin.png'),   color: PaymentColors.plin,   gradientColors: ['#003D28','#001A12'] as [string, string] },
  izipay: { label: 'Izipay', logo: require('../../../assets/images/brands/izipay.png'), color: PaymentColors.izipay, gradientColors: ['#4A0008','#1E0004'] as [string, string] },
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
            <Image source={brand.logo} style={{ width: 22, height: 22 }} resizeMode="contain" />
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
        <Image source={brand.logo} style={{ width: 22, height: 22 }} resizeMode="contain" />
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

export default function TransactionDetailScreen() {
  const { c, toggle } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { transactions } = useTransactions();
  const transaction = transactions.find(t => t.id === id);

  const [historyModal, setHistoryModal] = useState(false);
  const [filterKey, setFilterKey]       = useState<string>('all');
  const [collapsed, setCollapsed]       = useState<Set<string>>(new Set());

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
    const out: Partial<Record<'yape'|'plin'|'izipay', { count: number; total: number }>> = {};
    txns.forEach(t => {
      if (!out[t.method]) out[t.method] = { count: 0, total: 0 };
      out[t.method]!.count++; out[t.method]!.total += t.amount;
    });
    return out;
  }, [filterKey, monthGroups]);

  if (!transaction) {
    return (
      <View style={{ flex: 1, backgroundColor: c.BACKGROUND_DARK, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <StatusBar style={c.isDark ? 'light' : 'dark'} />
        <Ionicons name="receipt-outline" size={40} color={c.TEXT_SECONDARY} />
        <Text style={{ color: c.TEXT_SECONDARY, fontSize: 15, fontFamily: 'Inter_400Regular', marginTop: 12, textAlign: 'center' }}>
          Esta transacción ya no está disponible.
        </Text>
        <TouchableOpacity onPress={() => router.back()}
          style={{ marginTop: 20, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, backgroundColor: c.BACKGROUND_CARD_2, borderWidth: 1, borderColor: c.BORDER }}>
          <Text style={{ color: c.TEXT_PRIMARY, fontFamily: 'Inter_600SemiBold' }}>Volver</Text>
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
    await Share.share({ message: `Comprobante YapLin\n${transaction.payerName} pagó ${formatAmount(transaction.amount)} vía ${brand.label}\nRef: ${transaction.reference}\nFecha: ${formatDate(transaction.timestamp)} ${formatTime(transaction.timestamp)}` });
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
            <TouchableOpacity onPress={toggle}
              style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={c.isDark ? 'sunny-outline' : 'moon-outline'} size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={{ width: 96, height: 96, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: `${brand.color}55`, marginBottom: 20, shadowColor: brand.color, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 }}>
            <Image source={brand.logo} style={{ width: 60, height: 60 }} resizeMode="contain" />
          </View>
          <Text style={{ color: '#fff', fontSize: 46, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', letterSpacing: -1.5, marginBottom: 12 }}>
            {formatAmount(transaction.amount)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${c.SUCCESS}22`, borderWidth: 1, borderColor: `${c.SUCCESS}55`, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 24 }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: c.SUCCESS }} />
            <Text style={{ color: c.SUCCESS, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>Confirmado</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, alignSelf: 'stretch' }}>
            <Avatar initials={transaction.payerInitials} size="sm" color={brand.color} />
            <View style={{ marginLeft: 10 }}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{transaction.payerName}</Text>
              <Text style={{ color: brand.color, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 }}>vía {brand.label}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Detail */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
            Detalle del pago
          </Text>
          <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, paddingHorizontal: 16, overflow: 'hidden' }}>
            <DetailRow label="Fecha"         value={formatDate(transaction.timestamp)} />
            <DetailRow label="Hora"          value={formatTime(transaction.timestamp)} />
            <DetailRow label="Referencia"    value={transaction.reference} valueColor={c.ACCENT_CYAN} />
            <DetailRow label="Medio de pago" value={brand.label} valueColor={brand.color} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15 }}>
              <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular' }}>Estado</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${c.SUCCESS}18`, borderWidth: 1, borderColor: `${c.SUCCESS}44`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.SUCCESS }} />
                <Text style={{ color: c.SUCCESS, fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>Confirmado</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Payer summary */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
            Resumen del cliente
          </Text>
          <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Avatar initials={transaction.payerInitials} size="lg" color={brand.color} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.TEXT_PRIMARY, fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>{transaction.payerName}</Text>
              <Text style={{ color: c.TEXT_SECONDARY, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 3 }}>{allPayerTxns.length} pagos · {formatAmount(totalFromPayer)} total</Text>
            </View>
          </View>
        </View>

        {/* History preview */}
        {historyPreview.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ color: c.TEXT_SECONDARY, fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.2 }}>Historial de pagos</Text>
              <TouchableOpacity onPress={openModal}>
                <Text style={{ color: c.ACCENT_CYAN, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>Ver más</Text>
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
            <Text style={{ color: c.ACCENT_CYAN, fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>Compartir comprobante</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85}
            style={{ height: 56, borderRadius: 18, backgroundColor: `${c.ACCENT_RED}11`, borderWidth: 1, borderColor: `${c.ACCENT_RED}33`, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Ionicons name="flag-outline" size={20} color={c.ACCENT_RED} />
            <Text style={{ color: c.ACCENT_RED, fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>Reportar problema</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ══ HISTORIAL MODAL ══ */}
      <Modal visible={historyModal} animationType="slide" onRequestClose={() => setHistoryModal(false)}>
        <View style={{ flex: 1, backgroundColor: c.BACKGROUND_DARK }}>
          <StatusBar style={c.isDark ? 'light' : 'dark'} />

          <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: c.BORDER }}>
            <TouchableOpacity onPress={() => setHistoryModal(false)}
              style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.BACKGROUND_CARD_2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.BORDER }}>
              <Ionicons name="arrow-back" size={20} color={c.TEXT_PRIMARY} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ color: c.TEXT_PRIMARY, fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>Historial de pagos</Text>
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
                      {filterKey === 'all' ? 'Monto acumulado' : `${MES_FULL[parseInt(filterKey.split('-')[1])]} ${filterKey.split('-')[0]}`}
                    </Text>
                    <Text style={{ color: c.TEXT_PRIMARY, fontSize: 34, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', letterSpacing: -1, marginBottom: 3 }}>
                      {formatAmount(filteredTotal)}
                    </Text>
                    <Text style={{ color: c.TEXT_SECONDARY, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                      {filteredCount} pago{filteredCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: `${c.ACCENT_CYAN}18`, borderWidth: 1, borderColor: `${c.ACCENT_CYAN}33`, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="stats-chart" size={22} color={c.ACCENT_CYAN} />
                  </View>
                </View>
                <View style={{ height: 1, backgroundColor: c.isDark ? 'rgba(255,255,255,0.08)' : c.BORDER, marginVertical: 16 }} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {(Object.entries(filteredBreakdown) as [string, { count: number; total: number }][]).map(([method, data]) => {
                    const b = METHOD[method as keyof typeof METHOD];
                    return (
                      <View key={method} style={{ flex: 1, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: `${b.color}40`, backgroundColor: `${b.color}15` }}>
                        <Image source={b.logo} style={{ width: 24, height: 24, marginBottom: 8 }} resizeMode="contain" />
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
                const label  = key === 'all' ? 'Todos' : `${MES_ABR[parseInt(key.split('-')[1])]} ${key.split('-')[0]}`;
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
                        <Text style={{ color: c.TEXT_SECONDARY, fontSize: 11, fontFamily: 'Inter_400Regular' }}>{Math.round(pct)}% del total</Text>
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
                <Text style={{ color: c.TEXT_SECONDARY, fontSize: 15, fontFamily: 'Inter_400Regular' }}>Sin pagos en este período</Text>
              </View>
            )}

          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
