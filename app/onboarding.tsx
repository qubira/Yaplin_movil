import { useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Dimensions, ListRenderItem } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Gradients } from '../constants/colors';
import { useTheme } from '../constants/theme';
import { useTranslation } from '../store/LocaleStore';
import ThemeToggle from '../components/ui/ThemeToggle';

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
}

export default function OnboardingScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useTranslation();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const slides: Slide[] = [
    { id: '1', icon: 'notifications',       iconColor: c.ACCENT_RED,    title: t.onboarding.slides.slide1.title, description: t.onboarding.slides.slide1.description },
    { id: '2', icon: 'chatbubble-ellipses', iconColor: c.ACCENT_CYAN,   title: t.onboarding.slides.slide2.title, description: t.onboarding.slides.slide2.description },
    { id: '3', icon: 'bar-chart',           iconColor: c.ACCENT_PURPLE, title: t.onboarding.slides.slide3.title, description: t.onboarding.slides.slide3.description },
  ];

  const handleNext = async () => {
    await Haptics.selectionAsync();
    if (activeIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      router.replace('/(auth)');
    }
  };

  const renderSlide: ListRenderItem<Slide> = ({ item }) => (
    <View style={{ width, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <View style={{ width: 120, height: 120, borderRadius: 36, backgroundColor: `${item.iconColor}18`, alignItems: 'center', justifyContent: 'center', marginBottom: 40, shadowColor: item.iconColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 24, elevation: 8 }}>
        <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: `${item.iconColor}28`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${item.iconColor}44` }}>
          <Ionicons name={item.icon} size={40} color={item.iconColor} />
        </View>
      </View>
      <Text style={{ color: c.TEXT_PRIMARY, fontSize: 28, fontWeight: '800', textAlign: 'center', fontFamily: 'Inter_800ExtraBold', lineHeight: 34, marginBottom: 16 }}>
        {item.title}
      </Text>
      <Text style={{ color: c.TEXT_SECONDARY, fontSize: 16, textAlign: 'center', fontFamily: 'Inter_400Regular', lineHeight: 24 }}>
        {item.description}
      </Text>
    </View>
  );

  const isLast = activeIndex === slides.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: c.BACKGROUND_DARK }}>
      <StatusBar style={c.isDark ? 'light' : 'dark'} />

      {/* Toggle siempre visible, arriba a la izquierda */}
      <View style={{ position: 'absolute', top: insets.top + 16, left: 24, zIndex: 10 }}>
        <ThemeToggle />
      </View>

      {!isLast && (
        <TouchableOpacity onPress={() => router.replace('/(auth)')}
          style={{ position: 'absolute', top: insets.top + 16, right: 24, zIndex: 10, padding: 8 }}>
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>{t.onboarding.skip}</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={item => item.id}
        horizontal pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={{ flex: 1 }}
      />

      <View style={{ paddingHorizontal: 32, paddingBottom: insets.bottom + 32 }}>
        {/* Dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 32 }}>
          {slides.map((_, i) => (
            <View key={i} style={{ height: 6, width: i === activeIndex ? 24 : 6, borderRadius: 3, backgroundColor: i === activeIndex ? c.ACCENT_CYAN : c.BORDER, marginHorizontal: 3 }} />
          ))}
        </View>

        {/* Button */}
        <TouchableOpacity onPress={handleNext} activeOpacity={0.85}>
          <LinearGradient colors={Gradients.PRIMARY} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>
              {isLast ? t.onboarding.start : t.onboarding.next}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}
