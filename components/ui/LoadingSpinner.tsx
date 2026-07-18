import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

export default function LoadingSpinner({ size = 'large', fullScreen = false }: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <View style={s.fullScreen}>
        <ActivityIndicator size={size} color={Colors.ACCENT_CYAN} />
      </View>
    );
  }
  return <ActivityIndicator size={size} color={Colors.ACCENT_CYAN} />;
}

const s = StyleSheet.create({
  fullScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.BACKGROUND_DARK },
});
