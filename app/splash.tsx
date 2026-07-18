import { useEffect } from 'react';
import { View, Image } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring, withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../constants/theme';
import { Gradients } from '../constants/colors';

export default function SplashScreen() {
  const { c } = useTheme();
  const opacity    = useSharedValue(0);
  const scale      = useSharedValue(0.7);
  const barWidth   = useSharedValue(0);
  const barOpacity = useSharedValue(0);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%` as unknown as number,
  }));
  const barContainerStyle = useAnimatedStyle(() => ({
    opacity: barOpacity.value,
  }));

  useEffect(() => {
    opacity.value  = withSpring(1, { damping: 15, stiffness: 120 });
    scale.value    = withSpring(1, { damping: 12, stiffness: 100 });
    barOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
    barWidth.value   = withDelay(600, withTiming(100, { duration: 1800, easing: Easing.out(Easing.cubic) }));
    const timer = setTimeout(() => router.replace('/onboarding'), 2600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: c.BACKGROUND_DARK, alignItems: 'center', justifyContent: 'center' }}>
      <StatusBar style={c.isDark ? 'light' : 'dark'} />

      <Animated.View style={[logoStyle, { alignItems: 'center' }]}>
        <Image
          source={require('../assets/images/brands/logoyaplin.png')}
          style={{ width: 160, height: 160, marginBottom: 16 }}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Progress bar */}
      <Animated.View style={[{ position: 'absolute', bottom: 60, left: 40, right: 40 }, barContainerStyle]}>
        <View style={{ height: 3, backgroundColor: c.BORDER, borderRadius: 2, overflow: 'hidden' }}>
          <Animated.View style={barStyle}>
            <LinearGradient colors={Gradients.FULL} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, height: '100%' }} />
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}
