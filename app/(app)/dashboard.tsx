import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, Pressable, StyleSheet, Dimensions, Image,
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
import { useTopInset } from '../../hooks/useTopInset';
import TransactionItem from '../../components/ui/TransactionItem';
import Avatar from '../../components/ui/Avatar';
import BrandLoader from '../../components/ui/BrandLoader';

type Period = 'Hoy' | 'Día' | 'Semana' | 'Mes';

const ABR  = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const { width: SW } = Dimensions.get('window');
const MONTH_CELL_W = Math.floor((SW - 48 - 30) / 4);

const METHOD_LOGOS = {
  yape:   require('../../assets/images/brands/yape.png'),
  plin:   require('../../assets/images/brands/plin.png'),
  izipay: require('../../assets/images/brands/izipay.png'),
};
const METHOD_LABELS: Record<string, string> = { yape: 'Yape', plin: 'Plin', izipay: 'Izipay' };

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

function labelPeriodo(p: Period, sel: Sel, hoy: Date) {
  if (p === 'Hoy')    return `${hoy.getDate()} ${FULL[hoy.getMonth()]} ${hoy.getFullYear()}`;
  if (p === 'Día')    return `${sel.diaD} ${FULL[sel.diaM]} ${sel.diaY}`;
  if (p === 'Semana') return `Sem ${sel.semN}: ${sel.semS} ${ABR[sel.semM]} – ${sel.semE} ${ABR[sel.semM]} ${sel.semY}`;
  return `${FULL[sel.mesM]} ${sel.mesY}`;
}

function VerTodosRow({ txn, onPress }: { txn: Transaction; onPress: () => void }) {
  const { c } = useTheme();
  const color = PaymentColors[txn.method];
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}>
      <Avatar initials={txn.payerInitials} size="md" color={color} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: c.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
          {txn.payerName}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
          <Image source={METHOD_LOGOS[txn.method]} style={{ width: 13, height: 13, borderRadius: 3 }} resizeMode="contain" />
          <Text style={{ color, fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
            {METHOD_LABELS[txn.method]}
          </Text>
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 12 }}>·</Text>
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 11, fontFamily: 'Inter_400Regular' }}>{txn.reference}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={{ color: c.SUCCESS, fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>
          {formatAmount(txn.amount)}
        </Text>
        <Text style={{ color: c.TEXT_SECONDARY, fontSize: 10, fontFamily: 'Inter_400Regular' }}>
          {formatDate(txn.timestamp)}  {formatTime(txn.timestamp)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const { c: Colors, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = useTopInset(20);
  const hoy = new Date();

  const [periodo, setPeriodo]         = useState<Period>('Hoy');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [verTodos, setVerTodos]       = useState(false);
  const { transactions: allTxns, transactionsLoading, removeTransaction } = useTransactions();

  const [navY, setNavY]     = useState(hoy.getFullYear());
  const [navM, setNavM]     = useState(hoy.getMonth());
  const [tempDia, setTempDia] = useState(hoy.getDate());

  const [sel, setSel] = useState<Sel>({
    diaY: hoy.getFullYear(), diaM: hoy.getMonth(), diaD: hoy.getDate(),
    semY: hoy.getFullYear(), semM: hoy.getMonth(), semN: 1, semS: 1, semE: 7,
    mesY: hoy.getFullYear(), mesM: hoy.getMonth(),
  });

  const txnsAll  = useMemo(() => filtrar(allTxns, periodo, sel, hoy), [allTxns, periodo, sel]);
  const txns     = periodo === 'Hoy' ? txnsAll.slice(0, 10) : txnsAll;
  const total    = txnsAll.reduce((s, t) => s + t.amount, 0);

  const breakdown = useMemo(() => {
    const out: Partial<Record<'yape'|'plin'|'izipay', { count: number; total: number }>> = {};
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
    if (p === 'Día')         { setNavY(sel.diaY); setNavM(sel.diaM); setTempDia(sel.diaD); }
    else if (p === 'Semana') { setNavY(sel.semY); setNavM(sel.semM); }
    else                     { setNavY(sel.mesY); }
    setPickerVisible(true);
  }

  function prevMes() { if (navM === 0) { setNavM(11); setNavY(y => y - 1); } else setNavM(m => m - 1); }
  function nextMes() { if (navM === 11) { setNavM(0); setNavY(y => y + 1); } else setNavM(m => m + 1); }

  const semanas   = weeksOf(navY, navM);
  const totalDias = daysInMonth(navY, navM);
  const label     = labelPeriodo(periodo, sel, hoy);

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
          <Avatar initials="MN" size="md" color={Colors.ACCENT_PURPLE} />
          <View>
            <Text style={{ color: Colors.TEXT_SECONDARY, fontSize: 13, fontFamily: 'Inter_400Regular' }}>Buenos días</Text>
            <Text style={{ color: Colors.TEXT_PRIMARY, fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>Mi Negocio SAC</Text>
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
              Total recibido
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
                {txnsAll.length} transacciones
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
                    {p}
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
              {periodo === 'Hoy' ? 'Últimos pagos' : 'Pagos del período'}
            </Text>
            {txnsAll.length > 0 && (
              <TouchableOpacity onPress={() => setVerTodos(true)}>
                <Text style={{ color: Colors.ACCENT_CYAN, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>Ver todos</Text>
              </TouchableOpacity>
            )}
          </View>

          {transactionsLoading ? (
            <BrandLoader />
          ) : txns.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48, gap: 12 }}>
              <Ionicons name="receipt-outline" size={40} color={Colors.TEXT_SECONDARY} />
              <Text style={{ color: Colors.TEXT_SECONDARY, fontSize: 15, fontFamily: 'Inter_400Regular' }}>
                Sin pagos en este período
              </Text>
            </View>
          ) : (
            txns.map(txn => (
              <TransactionItem
                key={txn.id}
                transaction={txn}
                onDelete={() => removeTransaction(txn.id)}
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
      <Modal visible={verTodos} animationType="slide" onRequestClose={() => setVerTodos(false)}>
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
              <Text style={{ color: Colors.TEXT_PRIMARY, fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>Todos los pagos</Text>
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
                      Total del período
                    </Text>
                    <Text style={{ color: Colors.TEXT_PRIMARY, fontSize: 34, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', letterSpacing: -1, marginBottom: 3 }}>
                      {formatAmount(total)}
                    </Text>
                    <Text style={{ color: Colors.TEXT_SECONDARY, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                      {txnsAll.length} pago{txnsAll.length !== 1 ? 's' : ''}
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
                    {(Object.entries(breakdown) as [string, { count: number; total: number }][]).map(([method, data]) => {
                      const color = PaymentColors[method as keyof typeof PaymentColors];
                      return (
                        <View key={method} style={{ flex: 1, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: `${color}40`, backgroundColor: `${color}15` }}>
                          <Image source={METHOD_LOGOS[method as keyof typeof METHOD_LOGOS]} style={{ width: 22, height: 22, marginBottom: 6 }} resizeMode="contain" />
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
                Transacciones
              </Text>
              <Text style={{ color: Colors.TEXT_SECONDARY, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                {txnsAll.length} resultados
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
                      <VerTodosRow txn={txn} onPress={() => goToDetail(txn.id)} />
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Picker modal ── */}
      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }} onPress={() => setPickerVisible(false)} />
        <View style={{
          backgroundColor: Colors.BACKGROUND_CARD, borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: 24, paddingBottom: insets.bottom + 24, borderTopWidth: 1, borderColor: Colors.BORDER,
        }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.BORDER, alignSelf: 'center', marginBottom: 20 }} />
          <Text style={{ color: Colors.TEXT_PRIMARY, fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 16 }}>
            {periodo === 'Día' ? 'Seleccionar día' : periodo === 'Semana' ? 'Seleccionar semana' : 'Seleccionar mes'}
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
                onPress={() => { setSel(v => ({ ...v, diaY: navY, diaM: navM, diaD: tempDia })); setPickerVisible(false); }}
                style={{ marginTop: 16, backgroundColor: Colors.ACCENT_PURPLE, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
                  Ver {tempDia} {FULL[navM]} {navY}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {periodo === 'Semana' && (
            <View style={{ gap: 8, marginTop: 8 }}>
              {semanas.map(w => {
                const selW = sel.semN === w.n && sel.semM === navM && sel.semY === navY;
                return (
                  <TouchableOpacity key={w.n}
                    onPress={() => { setSel(v => ({ ...v, semY: navY, semM: navM, semN: w.n, semS: w.s, semE: w.e })); setPickerVisible(false); }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, borderWidth: 1,
                      backgroundColor: selW ? Colors.ACCENT_PURPLE : Colors.BACKGROUND_CARD_2,
                      borderColor: selW ? Colors.ACCENT_PURPLE : Colors.BORDER,
                    }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: selW ? '#fff' : Colors.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
                        Semana {w.n}
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
                const isSel = sel.mesM === i && sel.mesY === navY;
                const esHoy = i === hoy.getMonth() && navY === hoy.getFullYear();
                return (
                  <TouchableOpacity key={i}
                    onPress={() => { setSel(v => ({ ...v, mesY: navY, mesM: i })); setPickerVisible(false); }}
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
      </Modal>
    </View>
  );
}
