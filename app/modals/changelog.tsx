import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../constants/theme';
import { useTranslation } from '../../store/LocaleStore';
import { useLocale } from '../../store/LocaleStore';
import { useTopInset } from '../../hooks/useTopInset';
import { CHANGELOG } from '../../constants/changelog';

// Full screen instead of a bottom sheet — this list only grows over time,
// and a sheet capped at a fraction of the screen height made it fiddly to
// scroll (nested inside BottomSheetProvider's own gesture wrappers, on top
// of an already-short visible area). A pushed screen gets the whole screen
// to scroll in, same as any other detail view (e.g. transaction detail).
export default function ChangelogScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = useTopInset(20);
  const t = useTranslation();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'es';

  return (
    <View style={{ flex: 1, backgroundColor: c.BACKGROUND_DARK }}>
      <StatusBar style={c.isDark ? 'light' : 'dark'} />

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: topInset, paddingHorizontal: 24, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => router.back()}
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.BACKGROUND_CARD_2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.BORDER }}>
          <Ionicons name="arrow-back" size={20} color={c.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={{ color: c.TEXT_PRIMARY, fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', marginLeft: 14 }}>
          {t.settings.changelogModal.title}
        </Text>
      </View>

      {CHANGELOG.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
            {t.settings.changelogModal.empty}
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 32 }}>
          {CHANGELOG.map((entry, i) => (
            <View key={entry.version} style={{
              paddingBottom: 20, marginBottom: 20,
              borderBottomWidth: i === CHANGELOG.length - 1 ? 0 : 1, borderBottomColor: c.BORDER,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                <Text style={{ color: c.TEXT_PRIMARY, fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>
                  v{entry.version}
                </Text>
                <Text style={{ color: c.TEXT_SECONDARY, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
                  {entry.date}
                </Text>
              </View>
              {entry.changes.map((change, j) => (
                <View key={j} style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <Text style={{ color: c.ACCENT_PURPLE, fontSize: 14, fontFamily: 'Inter_400Regular' }}>•</Text>
                  <Text style={{ flex: 1, color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21 }}>
                    {change[lang]}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
