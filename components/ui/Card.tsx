import { View, StyleSheet, ViewProps } from 'react-native';
import { Colors } from '../../constants/colors';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated';
}

export default function Card({ children, variant = 'default', style, ...props }: CardProps) {
  return (
    <View
      style={[variant === 'elevated' ? s.elevated : s.base, style]}
      {...props}
    >
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  base: {
    backgroundColor: Colors.BACKGROUND_CARD,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    padding: 16,
  },
  elevated: {
    backgroundColor: Colors.BACKGROUND_CARD_2,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    padding: 16,
  },
});
