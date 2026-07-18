import { View, Text, SectionList, TouchableOpacity, Animated, Image } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { PaymentColors } from '../../constants/colors';
import { useTheme } from '../../constants/theme';
import { formatAmount, formatTime, Transaction } from '../../mocks/transactions';
import { useTransactions } from '../../store/PaymentsStore';
import EmptyState from '../../components/ui/EmptyState';
import ThemeToggle from '../../components/ui/ThemeToggle';

const methodLogos: Record<'yape' | 'plin' | 'izipay', any> = {
  yape:   require('../../assets/images/brands/yape.png'),
  plin:   require('../../assets/images/brands/plin.png'),
  izipay: require('../../assets/images/brands/izipay.png'),
};

const methodLabels: Record<Transaction['method'], string> = { yape: 'Yape', plin: 'Plin', izipay: 'Izipay' };

export default function NotificationsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { transactions: notifications, removeTransaction, markAllRead } = useTransactions();

  const deleteNotification = (id: string) => removeTransaction(id);
  const now = new Date();

  const today     = notifications.filter(n => (now.getTime() - n.timestamp.getTime()) / 3600000 < 24);
  const yesterday = notifications.filter(n => { const h = (now.getTime() - n.timestamp.getTime()) / 3600000; return h >= 24 && h < 48; });
  const thisWeek  = notifications.filter(n => (now.getTime() - n.timestamp.getTime()) / 3600000 >= 48);

  const sections = [
    ...(today.length     ? [{ title: 'Hoy',          data: today }]     : []),
    ...(yesterday.length ? [{ title: 'Ayer',          data: yesterday }] : []),
    ...(thisWeek.length  ? [{ title: 'Esta semana',   data: thisWeek }]  : []),
  ];

  const renderRightActions = (id: string, _p: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({ inputRange: [-80, 0], outputRange: [1, 0.5], extrapolate: 'clamp' });
    return (
      <TouchableOpacity onPress={() => deleteNotification(id)}
        style={{ backgroundColor: c.ACCENT_RED, justifyContent: 'center', alignItems: 'center', width: 72, marginVertical: 2, borderRadius: 16, marginLeft: 8 }}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: Transaction }) => (
    <Swipeable renderRightActions={(p, d) => renderRightActions(item.id, p, d)} overshootRight={false}>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: c.BACKGROUND_CARD, borderRadius: 18,
        padding: 18, marginBottom: 10, borderWidth: 1,
        borderColor: item.read ? c.BORDER : `${c.ACCENT_CYAN}33`,
      }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: `${PaymentColors[item.method]}22`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Image source={methodLogos[item.method] as any} style={{ width: 28, height: 28 }} resizeMode="contain" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.TEXT_PRIMARY, fontWeight: item.read ? '400' : '600', fontSize: 14, fontFamily: item.read ? 'Inter_400Regular' : 'Inter_600SemiBold' }}>
            {item.payerName}
          </Text>
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 12, marginTop: 2, fontFamily: 'Inter_400Regular' }}>
            Pago por {methodLabels[item.method]}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={{ color: c.SUCCESS, fontWeight: '700', fontSize: 15, fontFamily: 'Inter_700Bold' }}>
            {formatAmount(item.amount)}
          </Text>
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
            {formatTime(item.timestamp)}
          </Text>
          {!item.read && <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: c.ACCENT_CYAN }} />}
        </View>
      </View>
    </Swipeable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.BACKGROUND_DARK }}>
      <StatusBar style={c.isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: c.TEXT_PRIMARY, fontSize: 24, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' }}>
          Notificaciones
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
          <TouchableOpacity onPress={markAllRead}>
            <Text style={{ color: c.ACCENT_CYAN, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>Marcar leídas</Text>
          </TouchableOpacity>
        </View>
      </View>

      {notifications.length === 0 ? (
        <EmptyState icon="notifications-off-outline" title="Aún no tienes notificaciones" description="Las notificaciones de tus pagos aparecerán aquí en tiempo real." />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={{ color: c.TEXT_SECONDARY, fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, paddingVertical: 8, paddingHorizontal: 20, backgroundColor: c.BACKGROUND_DARK }}>
              {title}
            </Text>
          )}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
