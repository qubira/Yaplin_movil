import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../constants/theme';

export default function ThemeToggle() {
  const { c, toggle } = useTheme();
  return (
    <TouchableOpacity
      onPress={toggle}
      style={{
        width: 42, height: 42, borderRadius: 14,
        backgroundColor: c.BACKGROUND_CARD_2,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: c.BORDER,
      }}
    >
      <Ionicons name={c.isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={c.TEXT_PRIMARY} />
    </TouchableOpacity>
  );
}
