import React from 'react';
import { View, Text } from 'react-native';
import { Colors, PaymentColors } from '../../constants/colors';

type BadgeVariant = 'success' | 'warning' | 'info' | 'yape' | 'plin' | 'izipay' | 'error';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const variantConfig: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: `${Colors.SUCCESS}22`, text: Colors.SUCCESS },
  warning: { bg: `${Colors.WARNING}22`, text: Colors.WARNING },
  info: { bg: `${Colors.ACCENT_CYAN}22`, text: Colors.ACCENT_CYAN },
  error: { bg: `${Colors.ACCENT_RED}22`, text: Colors.ACCENT_RED },
  yape: { bg: `${PaymentColors.yape}22`, text: PaymentColors.yape },
  plin: { bg: `${PaymentColors.plin}22`, text: PaymentColors.plin },
  izipay: { bg: `${PaymentColors.izipay}22`, text: PaymentColors.izipay },
};

export default function Badge({ label, variant = 'info', size = 'sm' }: BadgeProps) {
  const config = variantConfig[variant];
  return (
    <View
      style={{ backgroundColor: config.bg, borderRadius: 999, paddingHorizontal: size === 'sm' ? 8 : 12, paddingVertical: size === 'sm' ? 3 : 5 }}
    >
      <Text
        style={{
          color: config.text,
          fontSize: size === 'sm' ? 11 : 13,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </View>
  );
}
