import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../constants/theme';
import type { SubscriptionSummary } from '../../store/AuthStore';

export function isSubscriptionBannerVisible(subscription: SubscriptionSummary | null | undefined): boolean {
  if (!subscription) return false;
  const { daysRemaining, status } = subscription;
  if (status !== 'active' && status !== 'trial') return false;
  if (daysRemaining > 3 || daysRemaining < 0) return false;
  return true;
}

export default function SubscriptionBanner({
  subscription,
}: {
  subscription: SubscriptionSummary | null | undefined;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  if (!isSubscriptionBannerVisible(subscription)) return null;

  const { daysRemaining } = subscription!;
  const urgent = daysRemaining <= 1;
  const color = urgent ? c.ACCENT_RED : c.WARNING;
  const message =
    daysRemaining <= 0
      ? 'Tu suscripción vence hoy.'
      : daysRemaining === 1
        ? 'Tu suscripción vence mañana.'
        : `Tu suscripción vence en ${daysRemaining} días.`;

  return (
    <View
      style={{
        backgroundColor: `${color}22`,
        paddingTop: insets.top + 10,
        paddingBottom: 10,
        paddingHorizontal: 16,
      }}
    >
      <Text style={{ color, fontSize: 13, fontFamily: 'Inter_600SemiBold', textAlign: 'center' }}>
        {message} Contacta al administrador para renovarla.
      </Text>
    </View>
  );
}
