import { View, Text, TouchableOpacity, Animated, Image } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { PaymentColors } from '../../constants/colors';
import { useTheme } from '../../constants/theme';
import Avatar from './Avatar';
import Badge from './Badge';
import { Transaction, formatAmount, formatTime } from '../../mocks/transactions';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
  onDelete?: () => void;
}

const methodLabels: Record<Transaction['method'], string> = { yape: 'Yape', plin: 'Plin', izipay: 'Izipay' };
const methodLogos: Record<Transaction['method'], any> = {
  yape:   require('../../assets/images/brands/yape.png'),
  plin:   require('../../assets/images/brands/plin.png'),
  izipay: require('../../assets/images/brands/izipay.png'),
};

export default function TransactionItem({ transaction, onPress, onDelete }: TransactionItemProps) {
  const { c } = useTheme();

  const renderRightActions = (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({ inputRange: [-80, 0], outputRange: [1, 0.5], extrapolate: 'clamp' });
    return (
      <TouchableOpacity onPress={onDelete}
        style={{ backgroundColor: c.ACCENT_RED, justifyContent: 'center', alignItems: 'center', width: 80, marginVertical: 2, borderRadius: 16 }}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}
        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.BACKGROUND_CARD, borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: c.BORDER }}>
        <Avatar initials={transaction.payerInitials} size="md" />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: c.TEXT_PRIMARY, fontWeight: '600', fontSize: 14, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
            {transaction.payerName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
            <Image source={methodLogos[transaction.method] as any} style={{ width: 14, height: 14, borderRadius: 3 }} resizeMode="contain" />
            <Text style={{ color: PaymentColors[transaction.method], fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
              {methodLabels[transaction.method]}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          <Text style={{ color: c.SUCCESS, fontWeight: '800', fontSize: 15, fontFamily: 'Inter_800ExtraBold' }}>
            {formatAmount(transaction.amount)}
          </Text>
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
            {formatTime(transaction.timestamp)}
          </Text>
          <Badge label="Confirmado" variant="success" />
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}
