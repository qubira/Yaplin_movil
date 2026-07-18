import { ColorValue } from 'react-native';

export const Colors = {
  BACKGROUND_DARK: '#0A0A0A',
  BACKGROUND_CARD: '#141414',
  BACKGROUND_CARD_2: '#1C1C1E',
  ACCENT_RED: '#FF3B5C',
  ACCENT_CYAN: '#00C6D7',
  ACCENT_PURPLE: '#7B2FFF',
  TEXT_PRIMARY: '#FFFFFF',
  TEXT_SECONDARY: '#A0A0A0',
  SUCCESS: '#00D48A',
  WARNING: '#FFB800',
  BORDER: '#2A2A2A',
} as const;

export const Gradients = {
  PRIMARY: [Colors.ACCENT_RED, Colors.ACCENT_PURPLE] as [ColorValue, ColorValue],
  FULL: [Colors.ACCENT_RED, Colors.ACCENT_PURPLE, Colors.ACCENT_CYAN] as [ColorValue, ColorValue, ColorValue],
  CARD: ['#1C1C1E', '#141414'] as [ColorValue, ColorValue],
  TRANSPARENT: ['transparent', 'transparent'] as [ColorValue, ColorValue],
} as const;

export const PaymentColors = {
  yape: '#6C1FC6',
  plin: '#00A86B',
  izipay: '#E8000D',
} as const;
