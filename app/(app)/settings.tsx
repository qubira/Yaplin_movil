import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Platform, AppState, Modal, KeyboardAvoidingView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { PaymentColors } from '../../constants/colors';
import { useTheme } from '../../constants/theme';
import { useIntegrations, usePreferences, PlinBank } from '../../store/PaymentsStore';
import { useAuth } from '../../store/AuthStore';
import { useLocale, useTranslation } from '../../store/LocaleStore';
import { LOCALES, LOCALE_META } from '../../translations/locales';
import { api, ApiError } from '../../services/api';
import { isNotificationAccessGranted, openNotificationAccessSettings } from '../../services/androidNotificationAccess';
import { isXiaomiDevice, openXiaomiAutostartSettings, requestIgnoreBatteryOptimizations } from '../../services/backgroundReliability';
import { requestPushPermission } from '../../services/pushNotifications';
import { getAppVersionInfo } from '../../services/appVersion';
import { useTopInset } from '../../hooks/useTopInset';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
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
  const t = useTranslation();
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
          {connected ? (connectedLabel ?? t.common.actions.connected) : t.common.actions.connect}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ActionRow({ icon, label, buttonLabel, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; buttonLabel: string; onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: c.BORDER }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: `${c.ACCENT_PURPLE}22`, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
        <Ionicons name={icon} size={18} color={c.ACCENT_PURPLE} />
      </View>
      <Text style={{ flex: 1, color: c.TEXT_PRIMARY, fontSize: 15, fontFamily: 'Inter_400Regular' }}>{label}</Text>
      <TouchableOpacity onPress={onPress} style={{
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10,
        backgroundColor: `${c.ACCENT_PURPLE}22`, borderWidth: 1, borderColor: `${c.ACCENT_PURPLE}44`,
      }}>
        <Text style={{ color: c.ACCENT_PURPLE, fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{buttonLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function LanguageRow({ code, onPress }: { code: typeof LOCALES[number]; onPress: () => void }) {
  const { c } = useTheme();
  const t = useTranslation();
  const { locale } = useLocale();
  const meta = LOCALE_META[code];
  const selected = locale === code;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={meta.comingSoon}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row', alignItems: 'center', paddingVertical: 18,
        borderBottomWidth: 1, borderBottomColor: c.BORDER,
        opacity: meta.comingSoon ? 0.45 : 1,
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: `${c.ACCENT_PURPLE}22`, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
        <Ionicons name="language-outline" size={18} color={c.ACCENT_PURPLE} />
      </View>
      <Text style={{ flex: 1, color: c.TEXT_PRIMARY, fontSize: 15, fontFamily: 'Inter_400Regular' }}>{meta.nativeName}</Text>
      {meta.comingSoon ? (
        <View style={{
          paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
          backgroundColor: `${c.TEXT_SECONDARY}22`, borderWidth: 1, borderColor: `${c.TEXT_SECONDARY}44`,
        }}>
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
            {t.settings.languageComingSoon}
          </Text>
        </View>
      ) : (
        <Ionicons
          name={selected ? 'radio-button-on' : 'radio-button-off'}
          size={20}
          color={selected ? c.ACCENT_PURPLE : c.TEXT_SECONDARY}
        />
      )}
    </TouchableOpacity>
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

// Set/change/remove the money-action confirmation PIN — PATCH /me/pin always
// requires the current password too, since the PIN is what stands between
// an unlocked phone and editing/voiding money.
function PinModal({ visible, mode, hasExisting, onClose, onSaved }: {
  visible: boolean;
  mode: 'save' | 'remove';
  hasExisting: boolean;
  onClose: () => void;
  onSaved: (hasTransactionPin: boolean) => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useTranslation();
  const [password, setPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setPassword('');
    setNewPin('');
    setError('');
  }, [visible]);

  async function handleSubmit() {
    if (!password) { setError(t.settings.pinModal.missingPassword); return; }
    if (mode === 'save' && !/^\d{4,8}$/.test(newPin)) { setError(t.settings.pinModal.invalidPin); return; }
    setError('');
    setSaving(true);
    try {
      const res = await api.patch<{ hasTransactionPin: boolean }>('/me/pin', {
        password,
        newPin: mode === 'remove' ? null : newPin,
      });
      onSaved(res.hasTransactionPin);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 401 ? t.settings.pinModal.wrongPassword : t.settings.pinModal.genericError);
    } finally {
      setSaving(false);
    }
  }

  const title = mode === 'remove' ? t.settings.security.removePin : hasExisting ? t.settings.pinModal.titleChange : t.settings.pinModal.titleSet;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* The dark overlay stays a plain flex:1 View (always covers the full
          screen) — only the sheet card itself moves for the keyboard, inside
          the KeyboardAvoidingView. Wrapping the overlay too left a gap at the
          bottom showing the screen behind the modal, uncovered. */}
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <KeyboardAvoidingView
          style={{ width: '100%' }}
          behavior="padding"
        >
          <View style={{ backgroundColor: c.BACKGROUND_CARD, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: insets.bottom + 20 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.BORDER, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ color: c.TEXT_PRIMARY, fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 8 }}>{title}</Text>
            {mode === 'save' && (
              <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21, marginBottom: 16 }}>
                {t.settings.pinModal.description}
              </Text>
            )}
            <Input
              label={t.settings.pinModal.passwordLabel}
              placeholder={t.settings.pinModal.passwordPlaceholder}
              value={password}
              onChangeText={setPassword}
              isPassword
              leftIcon="lock-closed-outline"
            />
            {mode === 'save' && (
              <Input
                label={t.settings.pinModal.newPinLabel}
                placeholder={t.settings.pinModal.newPinPlaceholder}
                value={newPin}
                onChangeText={(v) => setNewPin(v.replace(/[^0-9]/g, '').slice(0, 8))}
                keyboardType="number-pad"
                secureTextEntry
                leftIcon="keypad-outline"
              />
            )}
            {!!error && <Text style={{ color: c.ACCENT_RED, fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 8 }}>{error}</Text>}
            <TouchableOpacity onPress={handleSubmit} disabled={saving}
              style={{ marginTop: 8, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: mode === 'remove' ? c.ACCENT_RED : c.ACCENT_PURPLE, opacity: saving ? 0.7 : 1 }}>
              <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>
                {saving ? t.common.actions.saving : mode === 'remove' ? t.settings.pinModal.removeButton : t.settings.pinModal.save}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}
              style={{ marginTop: 10, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.BACKGROUND_CARD_2, borderWidth: 1, borderColor: c.BORDER }}>
              <Text style={{ color: c.TEXT_PRIMARY, fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>{t.settings.pinModal.cancel}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function SettingsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = useTopInset(24);
  const t = useTranslation();
  const { locale, setLocale } = useLocale();
  const { integrations, setYape, setIzipay, setPlinBank } = useIntegrations();
  const { preferences, setVoiceEnabled, setPushEnabled, setCaptureActive } = usePreferences();

  async function togglePush(v: boolean) {
    if (v) {
      const granted = await requestPushPermission();
      if (!granted) return;
    }
    setPushEnabled(v);
  }
  const { user, logout, refreshUser } = useAuth();
  const versionInfo = getAppVersionInfo();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [plinModal, setPlinModal] = useState(false);
  const [languageModal, setLanguageModal] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'save' | 'remove' | null>(null);

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
        <View style={{ paddingTop: topInset, paddingHorizontal: 24, paddingBottom: 32, borderBottomWidth: 1, borderBottomColor: c.BORDER, alignItems: 'center' }}>
          <View style={{ position: 'absolute', top: topInset - 8, right: 24 }}>
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
          <SectionTitle title={t.settings.section.myBusiness} />
          <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.BORDER }}>
              <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular' }}>{t.settings.myBusiness.owner}</Text>
              <Text style={{ color: c.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{user?.name ?? '—'}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.BORDER }}>
              <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular' }}>{t.settings.myBusiness.plan}</Text>
              <Badge label={user?.subscription?.planName ?? '—'} variant="info" size="md" />
            </View>
            {!!user?.subscription && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.BORDER }}>
                <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular' }}>{t.settings.myBusiness.expires}</Text>
                <Text style={{ color: c.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
                  {new Date(user.subscription.currentPeriodEnd).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
              </View>
            )}
          </View>

          {/* Seguridad */}
          <SectionTitle title={t.settings.section.security} />
          <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, paddingHorizontal: 16 }}>
            <ActionRow
              icon="keypad-outline"
              label={user?.hasTransactionPin ? t.settings.security.pinRowLabelChange : t.settings.security.pinRowLabelSet}
              buttonLabel={user?.hasTransactionPin ? t.settings.security.pinRowButtonChange : t.settings.security.pinRowButtonConfigure}
              onPress={() => setPinModalMode('save')}
            />
            {user?.hasTransactionPin && (
              <ActionRow
                icon="close-circle-outline"
                label={t.settings.security.removePin}
                buttonLabel={t.settings.security.removePinButton}
                onPress={() => setPinModalMode('remove')}
              />
            )}
            {(user?.role === 'owner' || user?.role === 'supervisor') && (
              <ActionRow
                icon="alert-circle-outline"
                label={t.settings.security.alertCenter}
                buttonLabel={t.settings.security.openButton}
                onPress={() => router.push('/(app)/alert-center')}
              />
            )}
          </View>

          {/* Batería */}
          <SectionTitle title={t.settings.section.battery} />
          <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, paddingHorizontal: 16 }}>
            <ToggleRow
              icon="battery-charging-outline"
              label={t.settings.battery.captureActiveLabel}
              value={preferences.captureActive}
              onValueChange={setCaptureActive}
            />
            {Platform.OS === 'android' && (
              <ActionRow
                icon="shield-checkmark-outline"
                label={t.settings.battery.ignoreOptimization}
                buttonLabel={t.common.actions.configure}
                onPress={requestIgnoreBatteryOptimizations}
              />
            )}
            {isXiaomiDevice() && (
              <ActionRow
                icon="rocket-outline"
                label={t.settings.battery.xiaomiAutostart}
                buttonLabel={t.common.actions.configure}
                onPress={openXiaomiAutostartSettings}
              />
            )}
          </View>
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17, marginTop: 8, paddingHorizontal: 4 }}>
            {preferences.captureActive
              ? t.settings.battery.hintActive
              : t.settings.battery.hintPaused}
          </Text>

          {/* Notificaciones */}
          <SectionTitle title={t.settings.section.notifications} />
          <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, paddingHorizontal: 16 }}>
            <ToggleRow icon="notifications-outline" label={t.settings.notifications.push} value={preferences.pushEnabled} onValueChange={togglePush} />
            <ToggleRow icon="volume-medium-outline" label={t.settings.notifications.voiceAlert} value={preferences.voiceEnabled} onValueChange={setVoiceEnabled} />
          </View>

          {/* Integraciones */}
          <SectionTitle title={t.settings.section.integrations} />
          {Platform.OS !== 'android' ? (
            <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name="information-circle-outline" size={20} color={c.TEXT_SECONDARY} />
              <Text style={{ flex: 1, color: c.TEXT_SECONDARY, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 }}>
                {t.settings.integrations.androidOnly}
              </Text>
            </View>
          ) : (
            <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, paddingHorizontal: 16 }}>
              <IntegrationRow name="Yape" color={PaymentColors.yape} icon="phone-portrait-outline"
                connected={integrations.yape} onToggle={() => requestOrToggle(integrations.yape, setYape)} />
              <IntegrationRow name="Plin" color={PaymentColors.plin} icon="wallet-outline"
                connected={plinConnectedCount > 0}
                connectedLabel={t.settings.integrations.bankCount(plinConnectedCount)}
                onToggle={() => setPlinModal(true)} />
              <IntegrationRow name="Izipay" color={PaymentColors.izipay} icon="card-outline"
                connected={integrations.izipay} onToggle={() => requestOrToggle(integrations.izipay, setIzipay)} />
              {!permissionGranted && (
                <View style={{ paddingVertical: 14 }}>
                  <Text style={{ color: c.WARNING, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 }}>
                    {t.settings.integrations.permissionWarning}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Idioma */}
          <SectionTitle title={t.settings.languageSection} />
          <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, paddingHorizontal: 16 }}>
            <TouchableOpacity onPress={() => setLanguageModal(true)}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 18 }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: `${c.ACCENT_PURPLE}22`, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Ionicons name="language-outline" size={18} color={c.ACCENT_PURPLE} />
              </View>
              <Text style={{ flex: 1, color: c.TEXT_PRIMARY, fontSize: 15, fontFamily: 'Inter_400Regular' }}>{t.settings.languageSection}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular' }}>{LOCALE_META[locale].nativeName}</Text>
                <Ionicons name="chevron-forward" size={16} color={c.TEXT_SECONDARY} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Cuenta */}
          <SectionTitle title={t.settings.section.account} />
          <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, overflow: 'hidden' }}>
            <TouchableOpacity onPress={() => { logout(); router.replace('/(auth)'); }} style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
              <Ionicons name="log-out-outline" size={18} color={c.ACCENT_RED} style={{ marginRight: 12 }} />
              <Text style={{ flex: 1, color: c.ACCENT_RED, fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{t.settings.account.logout}</Text>
            </TouchableOpacity>
          </View>

          {/* Acerca de */}
          <SectionTitle title={t.settings.section.about} />
          <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, paddingHorizontal: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.BORDER }}>
              <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular' }}>{t.settings.about.version}</Text>
              <Text style={{ color: c.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{versionInfo.version}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.BORDER }}>
              <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular' }}>{t.settings.about.channel}</Text>
              <Text style={{ color: c.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{versionInfo.channel}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 }}>
              <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular' }}>{t.settings.about.update}</Text>
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
              {t.settings.plinModal.title}
            </Text>
            <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21, marginBottom: 16 }}>
              {t.settings.plinModal.description}
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
              <Text style={{ color: c.TEXT_PRIMARY, fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>{t.settings.plinModal.done}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PIN de transacciones */}
      <PinModal
        visible={pinModalMode !== null}
        mode={pinModalMode ?? 'save'}
        hasExisting={!!user?.hasTransactionPin}
        onClose={() => setPinModalMode(null)}
        onSaved={() => { refreshUser().catch(() => {}); }}
      />

      {/* Language picker */}
      <Modal visible={languageModal} transparent animationType="slide" onRequestClose={() => setLanguageModal(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: c.BACKGROUND_CARD, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: insets.bottom + 20 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.BORDER, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ color: c.TEXT_PRIMARY, fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 8 }}>
              {t.settings.languageModal.title}
            </Text>
            <Text style={{ color: c.TEXT_SECONDARY, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21, marginBottom: 16 }}>
              {t.settings.languageModal.description}
            </Text>
            <View style={{ borderRadius: 16, borderWidth: 1, borderColor: c.BORDER, paddingHorizontal: 16 }}>
              {LOCALES.map((code, i) => (
                <View key={code} style={i === LOCALES.length - 1 ? undefined : { borderBottomWidth: 1, borderBottomColor: c.BORDER }}>
                  <LanguageRow
                    code={code}
                    onPress={() => { setLocale(code); setLanguageModal(false); }}
                  />
                </View>
              ))}
            </View>
            <TouchableOpacity onPress={() => setLanguageModal(false)}
              style={{ marginTop: 20, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.BACKGROUND_CARD_2, borderWidth: 1, borderColor: c.BORDER }}>
              <Text style={{ color: c.TEXT_PRIMARY, fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>{t.settings.languageModal.done}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
