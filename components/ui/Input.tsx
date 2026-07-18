import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
}

export default function Input({ label, error, isPassword = false, leftIcon, ...props }: InputProps) {
  const { c } = useTheme();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Text style={{ color: c.TEXT_SECONDARY, fontSize: 13, fontWeight: '600', marginBottom: 8, fontFamily: 'Inter_600SemiBold' }}>
          {label}
        </Text>
      )}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: c.BACKGROUND_CARD_2,
        borderRadius: 16, borderWidth: 1,
        borderColor: error ? c.ACCENT_RED : c.BORDER,
        paddingHorizontal: 16, minHeight: 52,
      }}>
        {leftIcon && <Ionicons name={leftIcon} size={18} color={c.TEXT_SECONDARY} style={{ marginRight: 10 }} />}
        <TextInput
          style={{ flex: 1, color: c.TEXT_PRIMARY, fontSize: 15, paddingVertical: 12, fontFamily: 'Inter_400Regular' }}
          placeholderTextColor={c.TEXT_SECONDARY}
          secureTextEntry={isPassword && !showPassword}
          autoCapitalize="none"
          {...props}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(v => !v)} activeOpacity={0.7}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={c.TEXT_SECONDARY} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={{ color: c.ACCENT_RED, fontSize: 12, marginTop: 6, marginLeft: 4 }}>{error}</Text>}
    </View>
  );
}
