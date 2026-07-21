import { View, Text, TouchableOpacity } from 'react-native';
import { router, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../constants/theme';
import { useAuth } from '../../store/AuthStore';

export default function RegisterScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  if (user) return <Redirect href="/(app)/dashboard" />;

  return (
    <View style={{ flex: 1, backgroundColor: c.BACKGROUND_DARK }}>
      <StatusBar style={c.isDark ? 'light' : 'dark'} />
      <View style={{ paddingTop: insets.top + 24, paddingHorizontal: 32, flex: 1 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40, height: 40, borderRadius: 14, backgroundColor: c.BACKGROUND_CARD_2,
            alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.BORDER, marginBottom: 24,
          }}
        >
          <Ionicons name="arrow-back" size={20} color={c.TEXT_PRIMARY} />
        </TouchableOpacity>

        <Text style={{ color: c.TEXT_PRIMARY, fontSize: 26, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 8 }}>
          Registro deshabilitado
        </Text>
        <Text style={{ color: c.TEXT_SECONDARY, fontSize: 15, fontFamily: 'Inter_400Regular', marginBottom: 32 }}>
          Las cuentas de negocio ahora se crean desde el panel de administración. Contacta a
          soporte para dar de alta tu negocio. Una vez que tengas tu cuenta, tú mismo podrás
          agregar tiendas y trabajadores desde aquí.
        </Text>

        <TouchableOpacity onPress={() => router.replace('/(auth)')} activeOpacity={0.85}>
          <View style={{ height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.BACKGROUND_CARD_2, borderWidth: 1, borderColor: c.BORDER }}>
            <Text style={{ color: c.TEXT_PRIMARY, fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>
              Ir a iniciar sesión
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
