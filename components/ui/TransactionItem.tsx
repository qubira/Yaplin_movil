import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaymentColors } from '../../constants/colors';
import { useTheme } from '../../constants/theme';
import { useTranslation } from '../../store/LocaleStore';
import Avatar from './Avatar';
import Badge from './Badge';
import { Transaction, formatAmount, formatTime } from '../../mocks/transactions';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
}

const methodLabels: Record<Transaction['method'], string> = { yape: 'Yape', plin: 'Plin', izipay: 'Izipay', manual: 'Manual' };
// 'manual' has no brand image — it's rendered as an Ionicon instead (see
// the method-icon block below), never looked up in this map.
const methodLogos: Record<'yape' | 'plin' | 'izipay', any> = {
  yape:   require('../../assets/images/brands/yape.png'),
  plin:   require('../../assets/images/brands/plin.png'),
  izipay: require('../../assets/images/brands/izipay.png'),
};

// No swipe-to-delete here anymore — under the GENERAL-pool model, removing
// a payment is a deliberate "anular" action (owner only, requires a reason
// and PIN/CONFIRMAR confirmation), not a quick per-row gesture. That flow
// lives in the transaction detail screen instead.
export default function TransactionItem({ transaction, onPress }: TransactionItemProps) {
  const { c } = useTheme();
  const t = useTranslation();
  const isVoided = transaction.status === 'voided';
  const isEdited = transaction.amount !== transaction.originalAmount;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.BACKGROUND_CARD, borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: c.BORDER }}>
      <Avatar initials={transaction.payerInitials} size="md" />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: c.TEXT_PRIMARY, fontWeight: '600', fontSize: 14, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
          {transaction.payerName}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
          {transaction.method === 'manual' ? (
            <Ionicons name="create-outline" size={14} color={PaymentColors.manual} />
          ) : (
            <Image source={methodLogos[transaction.method]} style={{ width: 14, height: 14, borderRadius: 3 }} resizeMode="contain" />
          )}
          <Text style={{ color: PaymentColors[transaction.method], fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
            {methodLabels[transaction.method]}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 3 }}>
        <Text style={{
          color: isVoided ? c.TEXT_SECONDARY : c.SUCCESS, fontWeight: '800', fontSize: 15, fontFamily: 'Inter_800ExtraBold',
          textDecorationLine: isVoided ? 'line-through' : 'none',
        }}>
          {formatAmount(transaction.amount)}
        </Text>
        <Text style={{ color: c.TEXT_SECONDARY, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
          {formatTime(transaction.timestamp)}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {isEdited && <Ionicons name="pencil" size={11} color={c.WARNING} />}
          <Badge label={isVoided ? t.transaction.voided : t.transaction.confirmed} variant={isVoided ? 'error' : 'success'} />
        </View>
      </View>
    </TouchableOpacity>
  );
}
