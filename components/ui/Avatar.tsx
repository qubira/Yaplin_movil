import React from 'react';
import { View, Text, Image } from 'react-native';
import { Colors } from '../../constants/colors';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  initials?: string;
  imageUri?: string;
  size?: AvatarSize;
  color?: string;
}

const sizeDimensions: Record<AvatarSize, number> = { sm: 32, md: 44, lg: 60 };
const fontSizes: Record<AvatarSize, number> = { sm: 12, md: 16, lg: 22 };

const avatarColors = [
  Colors.ACCENT_RED,
  Colors.ACCENT_PURPLE,
  Colors.ACCENT_CYAN,
  '#FF9500',
  '#34C759',
  '#FF6B35',
];

function getColorForInitials(initials: string): string {
  // An empty/undefined `initials` (e.g. a manually-entered payment with no
  // payer name) made charCodeAt(0) return NaN, which propagated all the way
  // to an invalid "undefinedXX" color string below — guard against it here
  // instead of trusting every caller to always pass non-empty initials.
  if (!initials) return avatarColors[0];
  const code = initials.charCodeAt(0) + (initials.charCodeAt(1) || 0);
  return avatarColors[code % avatarColors.length];
}

export default function Avatar({ initials: rawInitials, imageUri, size = 'md', color }: AvatarProps) {
  // `initials = '?'` as a default parameter only kicks in when the prop is
  // `undefined` — a caller passing an explicit empty string (e.g. a
  // manually-entered payment with no payerInitials) skipped that default
  // entirely, leaving an empty avatar and feeding '' into color derivation.
  const initials = rawInitials || '?';
  const dim = sizeDimensions[size];
  const fontSize = fontSizes[size];
  const bgColor = color ?? getColorForInitials(initials);

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={{ width: dim, height: dim, borderRadius: dim / 2 }}
      />
    );
  }

  return (
    <View
      style={{
        width: dim,
        height: dim,
        borderRadius: dim / 2,
        backgroundColor: `${bgColor}33`,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: `${bgColor}55`,
      }}
    >
      <Text style={{ color: bgColor, fontSize, fontWeight: '700' }}>{initials}</Text>
    </View>
  );
}
