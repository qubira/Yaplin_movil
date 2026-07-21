import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Gradients } from '../../constants/colors';
import { useTheme } from '../../constants/theme';
import { useAuth } from '../../store/AuthStore';
import { ApiError } from '../../services/api';
import Input from '../../components/ui/Input';
import ThemeToggle from '../../components/ui/ThemeToggle';

export default function AuthScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, login, logoutReason, clearLogoutReason } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  if (user) return <Redirect href="/(app)/dashboard" />;

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Ingresa tu email y contraseña');
      return;
    }
    setError('');
    clearLogoutReason();
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.BACKGROUND_DARK }}>
      <StatusBar style={c.isDark ? 'light' : 'dark'} />
      <View style={{ position: 'absolute', top: insets.top + 16, right: 24, zIndex: 10 }}>
        <ThemeToggle />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingTop: insets.top + 60, paddingHorizontal: 32 }}>

            {/* Logo */}
            <View style={{ alignItems: 'center', marginBottom: 56 }}>
              <Image
                source={require('../../assets/images/brands/yaplin.png')}
                style={{ width: 110, height: 110, marginBottom: 20 }}
                resizeMode="contain"
              />
              <Text style={{ color: c.TEXT_SECONDARY, fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
                Notificaciones de pago en tiempo real
              </Text>
            </View>

            {/* Title */}
            <Text style={{ color: c.TEXT_PRIMARY, fontSize: 26, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 8 }}>
              Bienvenido
            </Text>
            <Text style={{ color: c.TEXT_SECONDARY, fontSize: 15, fontFamily: 'Inter_400Regular', marginBottom: 36 }}>
              Ingresa a tu cuenta para continuar
            </Text>

            {/* Form */}
            <View style={{ gap: 4 }}>
              <Input label="Email" placeholder="tu@negocio.com" value={email} onChangeText={setEmail} keyboardType="email-address" leftIcon="mail-outline" />
              <View style={{ height: 8 }} />
              <Input label="Contraseña" placeholder="••••••••" value={password} onChangeText={setPassword} isPassword leftIcon="lock-closed-outline" />
            </View>

            {!!logoutReason && !error && (
              <Text style={{ color: c.WARNING, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 8 }}>
                {logoutReason}
              </Text>
            )}
            {!!error && (
              <Text style={{ color: c.ACCENT_RED, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 8 }}>{error}</Text>
            )}

            <View style={{ height: 28 }} />

            {/* Login button */}
            <TouchableOpacity onPress={handleLogin} activeOpacity={0.85} disabled={loading}>
              <LinearGradient
                colors={Gradients.PRIMARY}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>
                    Iniciar sesión
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
