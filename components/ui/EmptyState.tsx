import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
}

export default function EmptyState({
  icon = 'notifications-off-outline',
  title,
  description,
}: EmptyStateProps) {
  return (
    <View style={s.container}>
      <View style={s.iconBg}>
        <Ionicons name={icon} size={36} color={Colors.ACCENT_PURPLE} />
      </View>
      <Text style={s.title}>{title}</Text>
      {description && <Text style={s.desc}>{description}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  iconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.ACCENT_PURPLE}22`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { color: Colors.TEXT_PRIMARY, fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8, fontFamily: 'Inter_700Bold' },
  desc: { color: Colors.TEXT_SECONDARY, fontSize: 14, textAlign: 'center', lineHeight: 20, fontFamily: 'Inter_400Regular' },
});
