import { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

/**
 * Small, non-blocking loading indicator for data fetched from the backend
 * (Neon). Meant to sit inline within a screen's content area — not a
 * full-screen overlay — while a query is in flight.
 */
export default function BrandLoader({ size = 48 }: { size?: number }) {
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 28 }}>
      <Animated.Image
        source={require('../../assets/images/brands/qubira.png')}
        style={{ width: size, height: size, opacity: pulse }}
        resizeMode="contain"
      />
    </View>
  );
}
