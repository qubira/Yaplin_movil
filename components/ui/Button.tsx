import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Gradients } from '../../constants/colors';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

const sizeStyles = {
  sm: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, fontSize: 14 },
  md: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, fontSize: 15 },
  lg: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 18, fontSize: 17 },
};

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  const sz = sizeStyles[size];
  const isDisabled = disabled || loading;

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={[fullWidth && s.fullWidth, { opacity: isDisabled ? 0.5 : 1 }]}
      >
        <LinearGradient
          colors={Gradients.PRIMARY}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[s.center, { paddingHorizontal: sz.paddingHorizontal, paddingVertical: sz.paddingVertical, borderRadius: sz.borderRadius }]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[s.textWhite, { fontSize: sz.fontSize, fontWeight: '700' }]}>{label}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantStyle = {
    secondary: s.variantSecondary,
    ghost: s.variantGhost,
    danger: s.variantDanger,
  }[variant as Exclude<Variant, 'primary'>];

  const textColor = {
    secondary: Colors.TEXT_PRIMARY,
    ghost: Colors.TEXT_SECONDARY,
    danger: Colors.ACCENT_RED,
  }[variant as Exclude<Variant, 'primary'>];

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[s.center, variantStyle, fullWidth && s.fullWidth,
        { paddingHorizontal: sz.paddingHorizontal, paddingVertical: sz.paddingVertical, borderRadius: sz.borderRadius },
        { opacity: isDisabled ? 0.5 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={{ color: textColor, fontSize: sz.fontSize, fontWeight: '600' }}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  fullWidth: { width: '100%' },
  textWhite: { color: '#fff' },
  variantSecondary: { borderWidth: 1, borderColor: Colors.BORDER, backgroundColor: Colors.BACKGROUND_CARD_2 },
  variantGhost: { backgroundColor: 'transparent' },
  variantDanger: { backgroundColor: `${Colors.ACCENT_RED}18`, borderWidth: 1, borderColor: `${Colors.ACCENT_RED}44` },
});
