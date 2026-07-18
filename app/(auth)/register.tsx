import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Gradients } from '../../constants/colors';
import { useTheme } from '../../constants/theme';
import { useAuth } from '../../store/AuthStore';
import { ApiError } from '../../services/api';
import Input from '../../components/ui/Input';

export default function RegisterScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, register } = useAuth();

  const [businessName, setBusinessName] = useState('');
  const [ruc, setRuc]                   = useState('');
  const [ownerName, setOwnerName]       = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);

  if (user) return <Redirect href="/(app)/dashboard" />;

  async function handleRegister() {
    if (!businessName.trim() || !ownerName.trim() || !email.trim() || !password) {
      setError('Completa todos los campos requeridos');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register({ businessName: businessName.trim(), ruc: ruc.trim(), ownerName: ownerName.trim(), email: email.trim(), password });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.BACKGROUND_DARK }}>
      <StatusBar style={c.isDark ? 'light' : 'dark'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingTop: insets.top + 24, paddingHorizontal: 32 }}>

            <TouchableOpacity onPress={() => router.back()}
              style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: c.BACKGROUND_CARD_2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.BORDER, marginBottom: 24 }}>
              <Ionicons name="arrow-back" size={20} color={c.TEXT_PRIMARY} />
            </TouchableOpacity>

            <Text style={{ color: c.TEXT_PRIMARY, fontSize: 26, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 8 }}>
              Crea tu negocio
            </Text>
            <Text style={{ color: c.TEXT_SECONDARY, fontSize: 15, fontFamily: 'Inter_400Regular', marginBottom: 32 }}>
              Esta cuenta será la dueña — desde aquí podrás agregar tiendas y trabajadores.
            </Text>

            <View style={{ gap: 4 }}>
              <Input label="Nombre del negocio" placeholder="Mi Negocio SAC" value={businessName} onChangeText={setBusinessName} leftIcon="business-outline" />
              <View style={{ height: 8 }} />
              <Input label="RUC (opcional)" placeholder="20123456789" value={ruc} onChangeText={setRuc} keyboardType="number-pad" leftIcon="document-text-outline" />
              <View style={{ height: 8 }} />
              <Input label="Tu nombre" placeholder="Juan Pérez" value={ownerName} onChangeText={setOwnerName} leftIcon="person-outline" />
              <View style={{ height: 8 }} />
              <Input label="Email" placeholder="tu@negocio.com" value={email} onChangeText={setEmail} keyboardType="email-address" leftIcon="mail-outline" />
              <View style={{ height: 8 }} />
              <Input label="Contraseña" placeholder="Mínimo 6 caracteres" value={password} onChangeText={setPassword} isPassword leftIcon="lock-closed-outline" />
            </View>

            {!!error && (
              <Text style={{ color: c.ACCENT_RED, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 8 }}>{error}</Text>
            )}

            <View style={{ height: 28 }} />

            <TouchableOpacity onPress={handleRegister} activeOpacity={0.85} disabled={loading}>
              <LinearGradient
                colors={Gradients.PRIMARY}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>
                    Crear cuenta
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
