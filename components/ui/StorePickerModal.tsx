import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../constants/theme';
import { useTranslation } from '../../store/LocaleStore';
import Input from './Input';

export interface StorePickerOption {
  id: string | null;
  name: string;
  // Pseudo-options that aren't really "a store" to search for (e.g.
  // "General", "Todas las tiendas") — always stay visible regardless of
  // the search text.
  pinned?: boolean;
}

interface StorePickerModalProps {
  onClose: () => void;
  options: StorePickerOption[];
  selectedId?: string | null;
  onSelect: (option: StorePickerOption) => void;
  title?: string;
}

// A searchable bottom sheet for picking one store out of a (potentially
// long) list — a plain vertical list of buttons becomes tedious to scroll
// past a handful of stores, so this always leads with a search field and
// filters as you type. `options` may include `pinned` pseudo-options (e.g.
// "General", "Todas las tiendas") that always stay visible regardless of
// the search text, since they're not really a "store" to search for.
export default function StorePickerModal({ onClose, options, selectedId, onSelect, title }: StorePickerModalProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useTranslation();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter(o => o.pinned || o.name.toLowerCase().includes(term));
  }, [options, query]);

  return (
    <View style={{
      backgroundColor: c.BACKGROUND_CARD, borderTopLeftRadius: 32, borderTopRightRadius: 20,
      padding: 24, paddingBottom: insets.bottom + 20, maxHeight: '80%',
      shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 24,
    }}>
      <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.BORDER, alignSelf: 'center', marginBottom: 16 }} />
      <Text style={{ color: c.TEXT_PRIMARY, fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 16 }}>
        {title ?? t.common.storePicker.title}
      </Text>
      <Input
        placeholder={t.common.storePicker.searchPlaceholder}
        value={query}
        onChangeText={setQuery}
        leftIcon="search-outline"
      />
      <View style={{ height: 12 }} />
      <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 360 }}>
        {filtered.length === 0 ? (
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', paddingVertical: 24 }}>
            {t.common.storePicker.noResults}
          </Text>
        ) : (
          <View style={{ gap: 8 }}>
            {filtered.map(option => {
              const active = selectedId === option.id;
              return (
                <TouchableOpacity
                  key={option.id ?? '__general__'}
                  onPress={() => { onSelect(option); onClose(); }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, borderWidth: 1,
                    backgroundColor: active ? c.ACCENT_PURPLE : c.BACKGROUND_CARD_2,
                    borderColor: active ? c.ACCENT_PURPLE : c.BORDER,
                  }}
                >
                  <Text style={{ flex: 1, color: active ? '#fff' : c.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
                    {option.name}
                  </Text>
                  {active && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
      <TouchableOpacity onPress={onClose}
        style={{ marginTop: 14, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.BACKGROUND_CARD_2, borderWidth: 1, borderColor: c.BORDER }}>
        <Text style={{ color: c.TEXT_PRIMARY, fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>{t.common.actions.cancel}</Text>
      </TouchableOpacity>
    </View>
  );
}
