import { View, Text } from 'react-native';
import { useTheme } from '../../constants/theme';
import type { SubscriptionSummary } from '../../store/AuthStore';

export default function SubscriptionBanner({
  subscription,
}: {
  subscription: SubscriptionSummary | null | undefined;
}) {
  const { c } = useTheme();
  if (!subscription) return null;

  const { daysRemaining, status } = subscription;
  if (status !== 'active' && status !== 'trial') return null;
  if (daysRemaining > 3 || daysRemaining < 0) return null;

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
        paddingVertical: 10,
        paddingHorizontal: 16,
      }}
    >
      <Text style={{ color, fontSize: 13, fontFamily: 'Inter_600SemiBold', textAlign: 'center' }}>
        {message} Contacta al administrador para renovarla.
      </Text>
    </View>
  );
}
