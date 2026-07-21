import { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { useTheme } from '../../constants/theme';

/**
 * Small, non-blocking loading indicator for data fetched from the backend
 * (Neon). Meant to sit inline within a screen's content area — not a
 * full-screen overlay — while a query is in flight. Three dots in the
 * brand's accent colors pulse in a staggered sequence.
 */
export default function BrandLoader({ size = 10 }: { size?: number }) {
  const { c } = useTheme();
  const colors = [c.ACCENT_RED, c.ACCENT_PURPLE, c.ACCENT_CYAN];
  const values = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    const loops = values.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(value, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          Animated.delay((2 - i) * 150),
        ])
      )
    );
    loops.forEach(loop => loop.start());
    return () => loops.forEach(loop => loop.stop());
  }, [values]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 28 }}>
      {values.map((value, i) => (
        <Animated.View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors[i],
            opacity: value,
            transform: [{ scale: value.interpolate({ inputRange: [0.3, 1], outputRange: [0.85, 1.15] }) }],
          }}
        />
      ))}
    </View>
  );
}
