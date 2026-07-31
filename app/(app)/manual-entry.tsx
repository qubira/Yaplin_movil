import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../constants/theme';
import { useTransactions } from '../../store/PaymentsStore';
import { useStores } from '../../store/StoresStore';
import { useAuth } from '../../store/AuthStore';
import { useTranslation } from '../../store/LocaleStore';
import { ApiError } from '../../services/api';
import { useTopInset } from '../../hooks/useTopInset';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { useBottomSheet } from '../../store/BottomSheetStore';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import StorePickerModal from '../../components/ui/StorePickerModal';

export default function ManualEntryScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = useTopInset(20);
  const t = useTranslation();
  const { user } = useAuth();
  const { stores } = useStores();
  const { createManualTransaction } = useTransactions();

  const [storeId, setStoreId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [payerName, setPayerName] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const keyboardHeight = useKeyboardHeight();
  const { present, dismiss } = useBottomSheet();

  const selectedStoreName = stores.find(s => s.id === storeId)?.name ?? null;

  function openStorePicker() {
    present(
      <StorePickerModal
        onClose={dismiss}
        options={stores.map(s => ({ id: s.id, name: s.name }))}
        selectedId={storeId}
        onSelect={(option) => setStoreId(option.id)}
      />
    );
  }

  // The nav entry point is hidden from non-owners, but a stray deep link or
  // stale bookmark could still land here — the backend also rejects the
  // POST outright, but the UI should never pretend the form works.
  if (user?.role !== 'owner') {
    return (
      <View style={{ flex: 1, backgroundColor: c.BACKGROUND_DARK }}>
        <StatusBar style={c.isDark ? 'light' : 'dark'} />
        <EmptyState icon="lock-closed-outline" title={t.manualEntry.blockedTitle} description={t.manualEntry.blockedDescription} />
      </View>
    );
  }

  async function handleSubmit() {
    setError('');
    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError(t.manualEntry.invalidAmount);
      return;
    }
    if (!storeId) {
      setError(t.manualEntry.storeRequired);
      return;
    }
    setSaving(true);
    try {
      await createManualTransaction({
        storeId,
        amount: numericAmount,
        payerName: payerName.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t.manualEntry.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.BACKGROUND_DARK }}>
      <StatusBar style={c.isDark ? 'light' : 'dark'} />

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: topInset, paddingHorizontal: 24, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => router.back()}
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.BACKGROUND_CARD_2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.BORDER }}>
          <Ionicons name="arrow-back" size={20} color={c.TEXT_PRIMARY} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={{ color: c.TEXT_PRIMARY, fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>{t.manualEntry.title}</Text>
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 1 }}>{t.manualEntry.subtitle}</Text>
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 40 + keyboardHeight }}>
        <Text style={{ color: c.TEXT_SECONDARY, fontSize: 13, fontWeight: '600', marginBottom: 8, fontFamily: 'Inter_600SemiBold' }}>
          {t.manualEntry.storeLabel}
        </Text>
        <TouchableOpacity onPress={openStorePicker}
          style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, borderWidth: 1, backgroundColor: c.BACKGROUND_CARD_2, borderColor: c.BORDER, marginBottom: 16 }}>
          <Ionicons name="business-outline" size={18} color={c.TEXT_SECONDARY} style={{ marginRight: 10 }} />
          <Text style={{ flex: 1, color: selectedStoreName ? c.TEXT_PRIMARY : c.TEXT_SECONDARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
            {selectedStoreName ?? t.manualEntry.storeLabel}
          </Text>
          <Ionicons name="chevron-down" size={18} color={c.TEXT_SECONDARY} />
        </TouchableOpacity>

        <Input
          label={t.manualEntry.amountLabel}
          placeholder={t.manualEntry.amountPlaceholder}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          leftIcon="cash-outline"
        />
        <Input
          label={t.manualEntry.payerNameLabel}
          placeholder={t.manualEntry.payerNamePlaceholder}
          value={payerName}
          onChangeText={setPayerName}
          leftIcon="person-outline"
        />
        <Input
          label={t.manualEntry.notesLabel}
          placeholder={t.manualEntry.notesPlaceholder}
          value={notes}
          onChangeText={setNotes}
          leftIcon="document-text-outline"
        />

        {!!error && <Text style={{ color: c.ACCENT_RED, fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 8 }}>{error}</Text>}

        <TouchableOpacity onPress={handleSubmit} disabled={saving} activeOpacity={0.85}
          style={{ marginTop: 8, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.ACCENT_PURPLE, opacity: saving ? 0.7 : 1 }}>
          {saving ? <ActivityIndicator color="#fff" /> : (
            <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>{t.manualEntry.submit}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
