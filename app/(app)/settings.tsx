import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Platform, AppState, Modal } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { PaymentColors } from '../../constants/colors';
import { useTheme } from '../../constants/theme';
import { useIntegrations, usePreferences, PlinBank } from '../../store/PaymentsStore';
import { useDefaultStore } from '../../store/StoresStore';
import { useAuth } from '../../store/AuthStore';
import { isNotificationAccessGranted, openNotificationAccessSettings } from '../../services/androidNotificationAccess';
import { requestPushPermission } from '../../services/pushNotifications';
import { getAppVersionInfo } from '../../services/appVersion';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import ThemeToggle from '../../components/ui/ThemeToggle';

const PLIN_BANKS: { key: PlinBank; label: string }[] = [
  { key: 'bbva', label: 'BBVA Perú' },
  { key: 'interbank', label: 'Interbank' },
  { key: 'scotiabank', label: 'Scotiabank Perú' },
];

function ToggleRow({ icon, label, value, onValueChange }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: c.BORDER }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: `${c.ACCENT_PURPLE}22`, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
        <Ionicons name={icon} size={18} color={c.ACCENT_PURPLE} />
      </View>
      <Text style={{ flex: 1, color: c.TEXT_PRIMARY, fontSize: 15, fontFamily: 'Inter_400Regular' }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: c.BORDER, true: `${c.ACCENT_PURPLE}80` }}
        thumbColor={value ? c.ACCENT_PURPLE : c.TEXT_SECONDARY}
        ios_backgroundColor={c.BORDER}
      />
    </View>
  );
}

function IntegrationRow({ name, color, icon, connected, connectedLabel, onToggle }: {
  name: string; color: string; icon: keyof typeof Ionicons.glyphMap; connected: boolean; connectedLabel?: string; onToggle: () => void;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: c.BORDER }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={{ flex: 1, color: c.TEXT_PRIMARY, fontSize: 15, fontFamily: 'Inter_400Regular' }}>{name}</Text>
      <TouchableOpacity onPress={onToggle} style={{
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10,
        backgroundColor: connected ? `${c.SUCCESS}22` : `${color}22`,
        borderWidth: 1, borderColor: connected ? `${c.SUCCESS}44` : `${color}44`,
      }}>
        <Text style={{ color: connected ? c.SUCCESS : color, fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
          {connected ? (connectedLabel ?? 'Conectado') : 'Conectar'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  const { c } = useTheme();
  return (
    <Text style={{ color: c.TEXT_SECONDARY, fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginTop: 32, marginBottom: 10, paddingHorizontal: 4 }}>
      {title}
    </Text>
  );
}

export default function SettingsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const { integrations, setYape, setIzipay, setPlinBank } = useIntegrations();
  const { preferences, setVoiceEnabled, setPushEnabled, setCaptureActive } = usePreferences();

  async function togglePush(v: boolean) {
    if (v) {
      const granted = await requestPushPermission();
      if (!granted) return;
    }
    setPushEnabled(v);
  }
  const { defaultStoreId, setDefaultStoreId, stores } = useDefaultStore();
  const { user, logout } = useAuth();
  const versionInfo = getAppVersionInfo();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [plinModal, setPlinModal] = useState(false);
  const [storeModal, setStoreModal] = useState(false);
  const defaultStoreName = stores.find(s => s.id === defaultStoreId)?.name ?? 'Sin asignar';

  // When "Conectar" has to send the user to Android Settings first, we remember
  // what they were trying to turn on so it finishes automatically the moment
  // they come back with the permission granted — no second tap required.
  const pendingConnectRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    setPermissionGranted(isNotificationAccessGranted());
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const nowGranted = isNotificationAccessGranted();
      setPermissionGranted(nowGranted);
      if (nowGranted && pendingConnectRef.current) {
        pendingConnectRef.current();
        pendingConnectRef.current = null;
      }
    });
    return () => subscription.remove();
  }, []);

  function requestOrToggle(current: boolean, setter: (v: boolean) => void) {
    if (!current && !permissionGranted) {
      pendingConnectRef.current = () => setter(true);
      openNotificationAccessSettings();
      return;
    }
    setter(!current);
  }

  const plinConnectedCount = PLIN_BANKS.filter(b => integrations.plinBanks[b.key]).length;

  return (
    <View style={{ flex: 1, backgroundColor: c.BACKGROUND_DARK }}>
      <StatusBar style={c.isDark ? 'light' : 'dark'} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>

        {/* User Header */}
        <View style={{ paddingTop: insets.top + 24, paddingHorizontal: 24, paddingBottom: 32, borderBottomWidth: 1, borderBottomColor: c.BORDER, alignItems: 'center' }}>
          <View style={{ position: 'absolute', top: insets.top + 16, right: 24 }}>
            <ThemeToggle />
          </View>
          <Avatar initials={user?.initials ?? '—'} size="lg" color={c.ACCENT_PURPLE} />
          <Text style={{ color: c.TEXT_PRIMARY, fontSize: 20, fontWeight: '700', fontFamily: 'Inter_700Bold', marginTop: 12 }}>
            {user?.name ?? '—'}
          </Text>
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
            {user?.email ?? ''}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 24 }}>

          {/* Mi negocio */}
          <SectionTitle title="Mi negocio" />
          <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.BORDER }}>
              <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular' }}>Dueño</Text>
              <Text style={{ color: c.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{user?.name ?? '—'}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.BORDER }}>
              <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular' }}>Plan</Text>
              <Badge label={user?.subscription?.planName ?? '—'} variant="info" size="md" />
            </View>
            {!!user?.subscription && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.BORDER }}>
                <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular' }}>Vence</Text>
                <Text style={{ color: c.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
                  {new Date(user.subscription.currentPeriodEnd).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
              </View>
            )}
            <TouchableOpacity onPress={() => setStoreModal(true)}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular' }}>Tienda predeterminada</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: c.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{defaultStoreName}</Text>
                <Ionicons name="chevron-forward" size={16} color={c.TEXT_SECONDARY} />
              </View>
            </TouchableOpacity>
          </View>
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17, marginTop: 8, paddingHorizontal: 4 }}>
            Los pagos que este celular capture se suman a la tienda predeterminada.
          </Text>

          {/* Batería */}
          <SectionTitle title="Batería" />
          <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, paddingHorizontal: 16 }}>
            <ToggleRow
              icon="battery-charging-outline"
              label="Captura activa"
              value={preferences.captureActive}
              onValueChange={setCaptureActive}
            />
          </View>
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17, marginTop: 8, paddingHorizontal: 4 }}>
            {preferences.captureActive
              ? 'YapLin revisa pagos nuevos cada 10 segundos y escucha las notificaciones de Yape/Plin/Izipay. Desactívalo cuando no estés atendiendo para ahorrar batería.'
              : 'Captura en pausa: no se sincroniza ni se leen notificaciones de pago. Actívalo antes de empezar a atender.'}
          </Text>

          {/* Notificaciones */}
          <SectionTitle title="Notificaciones" />
          <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, paddingHorizontal: 16 }}>
            <ToggleRow icon="notifications-outline" label="Notificaciones push" value={preferences.pushEnabled} onValueChange={togglePush} />
            <ToggleRow icon="chatbubble-ellipses-outline" label="WhatsApp" value={whatsappEnabled} onValueChange={setWhatsappEnabled} />
            <ToggleRow icon="volume-medium-outline" label="Alerta de voz" value={preferences.voiceEnabled} onValueChange={setVoiceEnabled} />
          </View>

          {/* Integraciones */}
          <SectionTitle title="Integraciones" />
          {Platform.OS !== 'android' ? (
            <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name="information-circle-outline" size={20} color={c.TEXT_SECONDARY} />
              <Text style={{ flex: 1, color: c.TEXT_SECONDARY, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 }}>
                La captura automática de pagos solo está disponible en Android.
              </Text>
            </View>
          ) : (
            <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, paddingHorizontal: 16 }}>
              <IntegrationRow name="Yape" color={PaymentColors.yape} icon="phone-portrait-outline"
                connected={integrations.yape} onToggle={() => requestOrToggle(integrations.yape, setYape)} />
              <IntegrationRow name="Plin" color={PaymentColors.plin} icon="wallet-outline"
                connected={plinConnectedCount > 0}
                connectedLabel={`${plinConnectedCount} banco${plinConnectedCount !== 1 ? 's' : ''}`}
                onToggle={() => setPlinModal(true)} />
              <IntegrationRow name="Izipay" color={PaymentColors.izipay} icon="card-outline"
                connected={integrations.izipay} onToggle={() => requestOrToggle(integrations.izipay, setIzipay)} />
              {!permissionGranted && (
                <View style={{ paddingVertical: 14 }}>
                  <Text style={{ color: c.WARNING, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 }}>
                    Al conectar se abrirán los Ajustes de Android para dar acceso a notificaciones a YapLin. Vuelve a la app después de activarlo.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Cuenta */}
          <SectionTitle title="Cuenta" />
          <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, overflow: 'hidden' }}>
            <TouchableOpacity onPress={() => { logout(); router.replace('/(auth)'); }} style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
              <Ionicons name="log-out-outline" size={18} color={c.ACCENT_RED} style={{ marginRight: 12 }} />
              <Text style={{ flex: 1, color: c.ACCENT_RED, fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>

          {/* Acerca de */}
          <SectionTitle title="Acerca de" />
          <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, paddingHorizontal: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.BORDER }}>
              <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular' }}>Versión</Text>
              <Text style={{ color: c.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{versionInfo.version}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.BORDER }}>
              <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular' }}>Canal</Text>
              <Text style={{ color: c.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{versionInfo.channel}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 }}>
              <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular' }}>Actualización</Text>
              <Text style={{ color: c.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{versionInfo.updateLabel}</Text>
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Plin bank picker */}
      <Modal visible={plinModal} transparent animationType="slide" onRequestClose={() => setPlinModal(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: c.BACKGROUND_CARD, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: insets.bottom + 20 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.BORDER, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ color: c.TEXT_PRIMARY, fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 8 }}>
              Plin por banco
            </Text>
            <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21, marginBottom: 16 }}>
              Plin no es una app propia: viene dentro de la app de tu banco. Activa los bancos desde los que recibes pagos por Plin.
            </Text>
            <View style={{ borderRadius: 16, borderWidth: 1, borderColor: c.BORDER, paddingHorizontal: 16 }}>
              {PLIN_BANKS.map((bank, i) => (
                <View key={bank.key} style={i === PLIN_BANKS.length - 1 ? undefined : { borderBottomWidth: 1, borderBottomColor: c.BORDER }}>
                  <ToggleRow
                    icon="business-outline"
                    label={bank.label}
                    value={integrations.plinBanks[bank.key]}
                    onValueChange={() => requestOrToggle(integrations.plinBanks[bank.key], (v) => setPlinBank(bank.key, v))}
                  />
                </View>
              ))}
            </View>
            <TouchableOpacity onPress={() => setPlinModal(false)}
              style={{ marginTop: 20, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.BACKGROUND_CARD_2, borderWidth: 1, borderColor: c.BORDER }}>
              <Text style={{ color: c.TEXT_PRIMARY, fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>Listo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Default store picker */}
      <Modal visible={storeModal} transparent animationType="slide" onRequestClose={() => setStoreModal(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: c.BACKGROUND_CARD, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: insets.bottom + 20 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.BORDER, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ color: c.TEXT_PRIMARY, fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 8 }}>
              Tienda predeterminada
            </Text>
            <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21, marginBottom: 16 }}>
              Este celular solo puede tener una cuenta de Yape/Plin/Izipay conectada. Todo pago capturado se suma a la tienda que elijas aquí.
            </Text>
            <View style={{ gap: 8 }}>
              {stores.map(store => {
                const active = store.id === defaultStoreId;
                return (
                  <TouchableOpacity key={store.id} onPress={() => { setDefaultStoreId(store.id); setStoreModal(false); }}
                    style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, borderWidth: 1, backgroundColor: active ? c.ACCENT_PURPLE : c.BACKGROUND_CARD_2, borderColor: active ? c.ACCENT_PURPLE : c.BORDER }}>
                    <Text style={{ flex: 1, color: active ? '#fff' : c.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{store.name}</Text>
                    {active && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={() => setStoreModal(false)}
              style={{ marginTop: 20, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.BACKGROUND_CARD_2, borderWidth: 1, borderColor: c.BORDER }}>
              <Text style={{ color: c.TEXT_PRIMARY, fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
