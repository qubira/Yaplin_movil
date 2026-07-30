import { useState } from 'react';
import { TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../constants/theme';

interface RefreshButtonProps {
  onRefresh: () => Promise<unknown>;
  size?: number;
}

// A visible "actualizar" affordance for any screen that queries, adds, or
// edits data — a manual way to confirm a change actually landed on the
// server, separate from (and in addition to) pull-to-refresh, which isn't
// always discovered.
export default function RefreshButton({ onRefresh, size = 42 }: RefreshButtonProps) {
  const { c } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  async function handlePress() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } catch {
      // Swallow — the calling screen already surfaces its own load-error state.
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={refreshing}
      style={{
        width: size, height: size, borderRadius: 14,
        backgroundColor: c.BACKGROUND_CARD_2,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: c.BORDER,
      }}
    >
      {refreshing ? (
        <ActivityIndicator size="small" color={c.TEXT_PRIMARY} />
      ) : (
        <Ionicons name="refresh-outline" size={20} color={c.TEXT_PRIMARY} />
      )}
    </TouchableOpacity>
  );
}
