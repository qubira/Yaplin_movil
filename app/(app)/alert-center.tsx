import { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, TextInput, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../constants/theme';
import { formatDate, formatTime } from '../../mocks/transactions';
import { useAuth } from '../../store/AuthStore';
import { useStores } from '../../store/StoresStore';
import { useTranslation } from '../../store/LocaleStore';
import { dictionaries } from '../../translations';
import { api, ApiError } from '../../services/api';
import { useTopInset } from '../../hooks/useTopInset';
import BrandLoader from '../../components/ui/BrandLoader';
import EmptyState from '../../components/ui/EmptyState';
import RefreshButton from '../../components/ui/RefreshButton';

type Severity = 'low' | 'medium' | 'high' | 'critical';
type EventType = 'LOGIN_FAILED' | 'BLOCKED_STORE_ACCESS' | 'BLOCKED_ROLE_ACTION' | 'WRONG_CONFIRMATION' | 'RISK_ESCALATED' | 'ACCOUNT_AUTO_BLOCKED';
type Period = 'today' | 'week' | 'month' | 'all';

interface SecurityIntent {
  id: string;
  createdAt: string;
  userId: string | null;
  actorEmail: string;
  actorName: string | null;
  actorRole: string | null;
  actorStoreId: string | null;
  eventType: EventType;
  severity: Severity;
  detail: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
}

const HIGH_COLOR = '#FF8A00';
const PERIOD_MS: Record<Exclude<Period, 'all'>, number> = {
  today: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 31 * 24 * 60 * 60 * 1000,
};

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

function roleLabel(role: string | null, t: typeof dictionaries['es']): string | null {
  if (role === 'owner') return t.common.roles.owner;
  if (role === 'supervisor') return t.common.roles.supervisor;
  if (role === 'cajero') return t.common.roles.cajero;
  return null;
}

function actionLabel(detail: Record<string, unknown> | null, t: typeof dictionaries['es']): string | null {
  const attempted = detail?.actionAttempted;
  if (typeof attempted !== 'string') return null;
  const labels = t.alertCenter.detail.actionLabels as Record<string, string>;
  return t.alertCenter.detail.actionAttempted(labels[attempted] ?? attempted);
}

function IntentRow({ intent, isLast, storeName }: { intent: SecurityIntent; isLast: boolean; storeName: string | null }) {
  const { c } = useTheme();
  const t = useTranslation();
  const severityColor: Record<Severity, string> = {
    low: c.TEXT_SECONDARY,
    medium: c.WARNING,
    high: HIGH_COLOR,
    critical: c.ACCENT_RED,
  };
  const color = severityColor[intent.severity];
  const role = roleLabel(intent.actorRole, t);
  const action = actionLabel(intent.detail, t);

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
      {!!action && (
        <Text style={{ color: c.TEXT_SECONDARY, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
          {action}
        </Text>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="person-outline" size={12} color={c.TEXT_SECONDARY} />
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
            {(intent.actorName ?? t.alertCenter.detail.unknownActor)}{role ? ` · ${role}` : ''}
          </Text>
        </View>
        <Text style={{ color: c.TEXT_SECONDARY, fontSize: 12 }}>·</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="business-outline" size={12} color={c.TEXT_SECONDARY} />
          <Text style={{ color: c.TEXT_SECONDARY, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
            {storeName ?? t.alertCenter.detail.generalStore}
          </Text>
        </View>
      </View>
      <Text style={{ color: c.TEXT_SECONDARY, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
        {intent.actorEmail}
      </Text>
      <Text style={{ color: c.TEXT_SECONDARY, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
        {formatDate(new Date(intent.createdAt))} · {formatTime(new Date(intent.createdAt))}
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
  const { stores } = useStores();

  const [items, setItems] = useState<SecurityIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [period, setPeriod] = useState<Period>('all');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [search, setSearch] = useState('');

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

  function storeNameFor(storeId: string | null): string | null {
    if (storeId === null) return null;
    return stores.find(s => s.id === storeId)?.name ?? null;
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = Date.now();
    return items.filter(intent => {
      if (period !== 'all') {
        const age = now - new Date(intent.createdAt).getTime();
        if (age > PERIOD_MS[period]) return false;
      }
      if (severityFilter !== 'all' && intent.severity !== severityFilter) return false;
      if (query) {
        const haystack = `${intent.actorName ?? ''} ${intent.actorEmail}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [items, period, severityFilter, search]);

  const PERIODS: Period[] = ['today', 'week', 'month', 'all'];
  const SEVERITIES: (Severity | 'all')[] = ['all', 'low', 'medium', 'high', 'critical'];

  return (
    <View style={{ flex: 1, backgroundColor: c.BACKGROUND_DARK }}>
      <StatusBar style={c.isDark ? 'light' : 'dark'} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: topInset, paddingHorizontal: 24, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.BACKGROUND_CARD_2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.BORDER }}>
            <Ionicons name="arrow-back" size={20} color={c.TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={{ color: c.TEXT_PRIMARY, fontSize: 22, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' }}>
            {t.alertCenter.title}
          </Text>
        </View>
        {!(user?.role === 'cajero' || forbidden) && <RefreshButton onRefresh={() => load()} />}
      </View>

      {user?.role === 'cajero' || forbidden ? (
        <EmptyState icon="lock-closed-outline" title={t.alertCenter.forbidden} />
      ) : (
        <>
          {/* Filters */}
          <View style={{ paddingHorizontal: 20, gap: 10, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.BACKGROUND_CARD, borderRadius: 14, borderWidth: 1, borderColor: c.BORDER, paddingHorizontal: 14, height: 46 }}>
              <Ionicons name="search-outline" size={16} color={c.TEXT_SECONDARY} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={t.alertCenter.filters.searchPlaceholder}
                placeholderTextColor={c.TEXT_SECONDARY}
                style={{ flex: 1, marginLeft: 8, color: c.TEXT_PRIMARY, fontSize: 13, fontFamily: 'Inter_400Regular' }}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {PERIODS.map(p => {
                const active = period === p;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPeriod(p)}
                    activeOpacity={0.8}
                    style={{
                      paddingHorizontal: 14, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: active ? c.ACCENT_PURPLE : c.BACKGROUND_CARD_2, borderWidth: 1, borderColor: active ? c.ACCENT_PURPLE : c.BORDER,
                    }}
                  >
                    <Text style={{ color: active ? '#fff' : c.TEXT_SECONDARY, fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
                      {t.alertCenter.filters.period[p]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {SEVERITIES.map(sev => {
                const active = severityFilter === sev;
                const label = sev === 'all' ? t.alertCenter.filters.severityAll : t.alertCenter.severity[sev];
                return (
                  <TouchableOpacity
                    key={sev}
                    onPress={() => setSeverityFilter(sev)}
                    activeOpacity={0.8}
                    style={{
                      paddingHorizontal: 14, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: active ? c.ACCENT_CYAN : c.BACKGROUND_CARD_2, borderWidth: 1, borderColor: active ? c.ACCENT_CYAN : c.BORDER,
                    }}
                  >
                    <Text style={{ color: active ? '#fff' : c.TEXT_SECONDARY, fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

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
            ) : filtered.length === 0 ? (
              <EmptyState icon="filter-outline" title={t.alertCenter.filters.noResults} />
            ) : (
              <View style={{ backgroundColor: c.BACKGROUND_CARD, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, paddingHorizontal: 16, overflow: 'hidden' }}>
                {filtered.map((intent, i) => (
                  <IntentRow key={intent.id} intent={intent} isLast={i === filtered.length - 1} storeName={storeNameFor(intent.actorStoreId)} />
                ))}
              </View>
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}
