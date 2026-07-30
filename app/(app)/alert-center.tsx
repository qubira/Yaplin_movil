import { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../constants/theme';
import { formatDate, formatTime } from '../../mocks/transactions';
import { useAuth } from '../../store/AuthStore';
import { useTranslation } from '../../store/LocaleStore';
import { dictionaries } from '../../translations';
import { api, ApiError } from '../../services/api';
import { useTopInset } from '../../hooks/useTopInset';
import BrandLoader from '../../components/ui/BrandLoader';
import EmptyState from '../../components/ui/EmptyState';

type Severity = 'low' | 'medium' | 'high' | 'critical';
type EventType = 'LOGIN_FAILED' | 'BLOCKED_STORE_ACCESS' | 'BLOCKED_ROLE_ACTION' | 'WRONG_CONFIRMATION' | 'RISK_ESCALATED' | 'ACCOUNT_AUTO_BLOCKED';

interface SecurityIntent {
  id: string;
  createdAt: string;
  userId: string;
  actorEmail: string;
  eventType: EventType;
  severity: Severity;
  detail: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
}

const HIGH_COLOR = '#FF8A00';

function relativeTime(iso: string, t: typeof dictionaries['es']): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return t.common.relativeTime.now;
  if (diffMin < 60) return t.common.relativeTime.minutesAgo(diffMin);
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return t.common.relativeTime.hoursAgo(diffHours);
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return t.common.relativeTime.daysAgo(diffDays);
  return `${formatDate(date)} ${formatTime(date)}`;
}

function IntentRow({ intent, isLast }: { intent: SecurityIntent; isLast: boolean }) {
  const { c } = useTheme();
  const t = useTranslation();
  const severityColor: Record<Severity, string> = {
    low: c.TEXT_SECONDARY,
    medium: c.WARNING,
    high: HIGH_COLOR,
    critical: c.ACCENT_RED,
  };
  const color = severityColor[intent.severity];

  return (
    <View style={{ paddingVertical: 14, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: c.BORDER }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${color}18`, borderWidth: 1, borderColor: `${color}44`, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
          <Text style={{ color, fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{t.alertCenter.severity[intent.severity]}</Text>
        </View>
        <Text style={{ color: c.TEXT_SECONDARY, fontSize: 11, fontFamily: 'Inter_400Regular' }}>{relativeTime(intent.createdAt, t)}</Text>
      </View>
      <Text style={{ color: c.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
        {t.alertCenter.eventTypes[intent.eventType]}
      </Text>
      <Text style={{ color: c.TEXT_SECONDARY, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
        {intent.actorEmail}
      </Text>
    </View>
  );
}

export default function AlertCenterScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = useTopInset(20);
  const t = useTranslation();
  const { user } = useAuth();

  const [items, setItems] = useState<SecurityIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setForbidden(false);
    setLoadError(false);
    try {
      const remote = await api.get<SecurityIntent[]>('/security/intents');
      setItems([...remote].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setForbidden(true);
      else setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load(true);
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.BACKGROUND_DARK }}>
      <StatusBar style={c.isDark ? 'light' : 'dark'} />

      <View style={{ paddingTop: topInset, paddingHorizontal: 24, paddingBottom: 20 }}>
        <Text style={{ color: c.TEXT_PRIMARY, fontSize: 22, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' }}>
          {t.alertCenter.title}
        </Text>
      </View>

      {user?.role === 'cajero' || forbidden ? (
        <EmptyState icon="lock-closed-outline" title={t.alertCenter.forbidden} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.ACCENT_PURPLE} />}
        >
          {loading ? (
            <BrandLoader />
          ) : loadError ? (
            <EmptyState icon="alert-circle-outline" title={t.alertCenter.loadError} />
          ) : items.length === 0 ? (
            <EmptyState icon="shield-checkmark-outline" title={t.alertCenter.empty.title} description={t.alertCenter.empty.description} />
          ) : (
            <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, paddingHorizontal: 16, overflow: 'hidden' }}>
              {items.map((intent, i) => <IntentRow key={intent.id} intent={intent} isLast={i === items.length - 1} />)}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
