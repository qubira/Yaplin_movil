import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../constants/theme';
import { TeamMember } from '../../mocks/stores';
import { useTeam, useStores } from '../../store/StoresStore';
import { useTopInset } from '../../hooks/useTopInset';
import { ApiError } from '../../services/api';
import Avatar from '../../components/ui/Avatar';
import BrandLoader from '../../components/ui/BrandLoader';
import Input from '../../components/ui/Input';
import ThemeToggle from '../../components/ui/ThemeToggle';

const ROLE_CONFIG = {
  owner:      { label: 'Dueño',      icon: 'shield-checkmark-outline' as const, desc: 'Acceso completo a todas las tiendas y configuraciones' },
  supervisor: { label: 'Supervisor', icon: 'eye-outline' as const,              desc: 'Ver y gestionar pagos de su tienda asignada' },
  cajero:     { label: 'Cajero',     icon: 'person-outline' as const,           desc: 'Solo recibe notificaciones de cobros de su tienda' },
};

const PERM_BY_ROLE: Record<TeamMember['role'], { label: string; allowed: boolean }[]> = {
  owner: [
    { label: 'Ver todas las tiendas', allowed: true },
    { label: 'Agregar/editar miembros', allowed: true },
    { label: 'Conciliación y reportes', allowed: true },
    { label: 'Configuración de cuenta', allowed: true },
    { label: 'Recibir notificaciones', allowed: true },
  ],
  supervisor: [
    { label: 'Ver todas las tiendas', allowed: false },
    { label: 'Agregar/editar miembros', allowed: false },
    { label: 'Conciliación y reportes', allowed: true },
    { label: 'Configuración de cuenta', allowed: false },
    { label: 'Recibir notificaciones', allowed: true },
  ],
  cajero: [
    { label: 'Ver todas las tiendas', allowed: false },
    { label: 'Agregar/editar miembros', allowed: false },
    { label: 'Conciliación y reportes', allowed: false },
    { label: 'Configuración de cuenta', allowed: false },
    { label: 'Recibir notificaciones', allowed: true },
  ],
};

function MemberCard({ member, storeName, onPress }: { member: TeamMember; storeName: string; onPress: () => void }) {
  const { c } = useTheme();
  const role = ROLE_CONFIG[member.role];
  const roleColor = member.role === 'owner' ? c.ACCENT_PURPLE : member.role === 'supervisor' ? c.ACCENT_CYAN : c.SUCCESS;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={[s.card, { backgroundColor: c.BACKGROUND_CARD, borderColor: c.BORDER, opacity: member.active ? 1 : 0.6 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ position: 'relative' }}>
          <Avatar initials={member.initials} size="md" color={roleColor} />
          {member.active && (
            <View style={[s.activeDot, { backgroundColor: c.SUCCESS, borderColor: c.BACKGROUND_CARD }]} />
          )}
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[s.memberName, { color: c.TEXT_PRIMARY }]}>{member.name}</Text>
          <Text style={[s.memberEmail, { color: c.TEXT_SECONDARY }]}>{member.email || 'Sin email'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Ionicons name="business-outline" size={11} color={c.TEXT_SECONDARY} />
            <Text style={[s.storeText, { color: c.TEXT_SECONDARY }]}>{storeName}</Text>
          </View>
        </View>
        <View>
          <View style={[s.rolePill, { backgroundColor: `${roleColor}18`, borderColor: `${roleColor}40` }]}>
            <Ionicons name={role.icon} size={12} color={roleColor} />
            <Text style={[s.roleLabel, { color: roleColor }]}>{role.label}</Text>
          </View>
          {!member.active && (
            <Text style={[s.inactiveLabel, { color: c.WARNING }]}>Inactivo</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

interface MemberFormData {
  name: string;
  email: string;
  role: TeamMember['role'];
  storeId: string;
  password?: string;
}

function MemberFormSheet({ visible, onClose, initial, storeOptions, onSubmit, title }: {
  visible: boolean;
  onClose: () => void;
  initial: TeamMember | null;
  storeOptions: { id: string; name: string }[];
  onSubmit: (data: MemberFormData) => Promise<void>;
  title: string;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const isEdit = !!initial;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<TeamMember['role']>('cajero');
  const [storeId, setStoreId] = useState<string>('all');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(initial?.name ?? '');
    setEmail(initial?.email ?? '');
    setPassword('');
    setRole(initial?.role ?? 'cajero');
    setStoreId(initial?.storeId ?? 'all');
    setError('');
  }, [visible, initial]);

  const canSubmit = name.trim() && (isEdit || password.length >= 6);

  async function handleSubmit() {
    if (!canSubmit || saving) return;
    setError('');
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), email: email.trim(), role, storeId, ...(password ? { password } : {}) });
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={[s.addSheet, { backgroundColor: c.BACKGROUND_CARD, paddingBottom: insets.bottom + 20 }]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={[s.sheetHandle, { backgroundColor: c.BORDER }]} />
            <Text style={[s.sheetTitle, { color: c.TEXT_PRIMARY }]}>{title}</Text>
            <View style={{ gap: 4 }}>
              <Input label="Nombre" placeholder="Ana Torres" value={name} onChangeText={setName} leftIcon="person-outline" />
              <View style={{ height: 8 }} />
              <Input label="Email" placeholder="ana@negocio.com" value={email} onChangeText={setEmail} keyboardType="email-address" leftIcon="mail-outline" />
              <View style={{ height: 8 }} />
              <Input
                label={isEdit ? 'Nueva contraseña (dejar en blanco para no cambiarla)' : 'Contraseña'}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChangeText={setPassword}
                isPassword
                leftIcon="lock-closed-outline"
              />
            </View>

            <Text style={[s.sectionTitle, { color: c.TEXT_SECONDARY, marginTop: 20, marginBottom: 10 }]}>Rol</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['owner', 'supervisor', 'cajero'] as TeamMember['role'][]).map(r => {
                const active = role === r;
                const rc = ROLE_CONFIG[r];
                return (
                  <TouchableOpacity key={r} onPress={() => setRole(r)} activeOpacity={0.8}
                    style={{ flex: 1, borderRadius: 14, padding: 10, alignItems: 'center', borderWidth: 1, backgroundColor: active ? `${c.ACCENT_PURPLE}18` : c.BACKGROUND_CARD_2, borderColor: active ? `${c.ACCENT_PURPLE}55` : c.BORDER }}>
                    <Ionicons name={rc.icon} size={18} color={active ? c.ACCENT_PURPLE : c.TEXT_SECONDARY} />
                    <Text style={{ color: active ? c.ACCENT_PURPLE : c.TEXT_SECONDARY, fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginTop: 6 }}>
                      {rc.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[s.sectionTitle, { color: c.TEXT_SECONDARY, marginTop: 20, marginBottom: 10 }]}>Tienda asignada</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[{ id: 'all', name: 'Todas las tiendas' }, ...storeOptions].map(opt => {
                const active = storeId === opt.id;
                return (
                  <TouchableOpacity key={opt.id} onPress={() => setStoreId(opt.id)} activeOpacity={0.8}
                    style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, backgroundColor: active ? c.ACCENT_PURPLE : c.BACKGROUND_CARD_2, borderColor: active ? c.ACCENT_PURPLE : c.BORDER }}>
                    <Text style={{ color: active ? '#fff' : c.TEXT_SECONDARY, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>{opt.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {!!error && (
              <Text style={{ color: c.ACCENT_RED, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 16 }}>{error}</Text>
            )}

            <TouchableOpacity onPress={handleSubmit} disabled={!canSubmit || saving}
              style={{ marginTop: 24, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: canSubmit ? c.ACCENT_PURPLE : c.BORDER, opacity: saving ? 0.7 : 1 }}>
              <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>{saving ? 'Guardando...' : 'Guardar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}
              style={{ marginTop: 10, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.BACKGROUND_CARD_2, borderWidth: 1, borderColor: c.BORDER }}>
              <Text style={{ color: c.TEXT_PRIMARY, fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function TeamScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = useTopInset(16);
  const { team, teamLoading, addMember, updateMember, removeMember } = useTeam();
  const { stores } = useStores();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const selected = team.find(m => m.id === selectedId) ?? null;
  const active = team.filter(m => m.active).length;

  function storeNameFor(storeId: string) {
    if (storeId === 'all') return 'Todas las tiendas';
    return stores.find(st => st.id === storeId)?.name ?? '—';
  }

  function handleDelete(member: TeamMember) {
    Alert.alert('Eliminar miembro', `¿Eliminar a "${member.name}" del equipo?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { removeMember(member.id); setSelectedId(null); } },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.BACKGROUND_DARK }}>
      <StatusBar style={c.isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[s.header, { paddingTop: topInset, borderBottomColor: c.BORDER }]}>
        <View>
          <Text style={[s.headerTitle, { color: c.TEXT_PRIMARY }]}>Mi equipo</Text>
          <Text style={[s.headerSub, { color: c.TEXT_SECONDARY }]}>{active} activos · {team.length} total</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
          <TouchableOpacity onPress={() => setAddModal(true)}
            style={[s.addBtn, { backgroundColor: c.ACCENT_PURPLE }]}>
            <Ionicons name="person-add-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingTop: 20 }}>

        {/* Role summary */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(['owner', 'supervisor', 'cajero'] as TeamMember['role'][]).map(role => {
              const cnt = team.filter(m => m.role === role).length;
              const rc  = ROLE_CONFIG[role];
              const col = role === 'owner' ? c.ACCENT_PURPLE : role === 'supervisor' ? c.ACCENT_CYAN : c.SUCCESS;
              return (
                <View key={role} style={[s.roleStat, { backgroundColor: c.BACKGROUND_CARD, borderColor: `${col}30` }]}>
                  <View style={[s.roleStatIcon, { backgroundColor: `${col}18` }]}>
                    <Ionicons name={rc.icon} size={18} color={col} />
                  </View>
                  <Text style={[s.roleStatCount, { color: c.TEXT_PRIMARY }]}>{cnt}</Text>
                  <Text style={[s.roleStatLabel, { color: c.TEXT_SECONDARY }]}>{rc.label}{cnt !== 1 ? 's' : ''}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Access matrix */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text style={[s.sectionTitle, { color: c.TEXT_SECONDARY, marginBottom: 10 }]}>Niveles de acceso</Text>
          <View style={[s.matrixCard, { backgroundColor: c.BACKGROUND_CARD, borderColor: c.BORDER }]}>
            {/* Header row */}
            <View style={[s.matrixRow, { borderBottomColor: c.BORDER }]}>
              <Text style={[s.matrixHeader, { color: c.TEXT_SECONDARY, flex: 2 }]}>Permiso</Text>
              <Text style={[s.matrixHeader, { color: c.ACCENT_PURPLE }]}>Dueño</Text>
              <Text style={[s.matrixHeader, { color: c.ACCENT_CYAN }]}>Sup.</Text>
              <Text style={[s.matrixHeader, { color: c.SUCCESS }]}>Cajero</Text>
            </View>
            {PERM_BY_ROLE.owner.map((perm, i) => (
              <View key={i} style={[s.matrixRow, i === PERM_BY_ROLE.owner.length - 1 && { borderBottomWidth: 0 }, { borderBottomColor: c.BORDER }]}>
                <Text style={[s.matrixPerm, { color: c.TEXT_SECONDARY, flex: 2 }]}>{perm.label}</Text>
                <Ionicons name={PERM_BY_ROLE.owner[i].allowed ? 'checkmark-circle' : 'close-circle'} size={16} color={PERM_BY_ROLE.owner[i].allowed ? c.SUCCESS : c.BORDER} style={{ textAlign: 'center', flex: 1 } as any} />
                <Ionicons name={PERM_BY_ROLE.supervisor[i].allowed ? 'checkmark-circle' : 'close-circle'} size={16} color={PERM_BY_ROLE.supervisor[i].allowed ? c.SUCCESS : c.BORDER} style={{ textAlign: 'center', flex: 1 } as any} />
                <Ionicons name={PERM_BY_ROLE.cajero[i].allowed ? 'checkmark-circle' : 'close-circle'} size={16} color={PERM_BY_ROLE.cajero[i].allowed ? c.SUCCESS : c.BORDER} style={{ textAlign: 'center', flex: 1 } as any} />
              </View>
            ))}
          </View>
        </View>

        {/* Team list */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={[s.sectionTitle, { color: c.TEXT_SECONDARY, marginBottom: 10 }]}>Miembros</Text>
          {teamLoading ? (
            <BrandLoader />
          ) : (
            team.map(member => (
              <MemberCard key={member.id} member={member} storeName={storeNameFor(member.storeId)} onPress={() => setSelectedId(member.id)} />
            ))
          )}
        </View>
      </ScrollView>

      {/* Member detail modal */}
      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelectedId(null)}>
        {selected && (
          <View style={{ flex: 1, backgroundColor: c.BACKGROUND_DARK }}>
            <StatusBar style={c.isDark ? 'light' : 'dark'} />
            <View style={[s.header, { paddingTop: insets.top + 16, borderBottomColor: c.BORDER }]}>
              <TouchableOpacity onPress={() => setSelectedId(null)} style={[s.backBtn, { backgroundColor: c.BACKGROUND_CARD_2, borderColor: c.BORDER }]}>
                <Ionicons name="arrow-back" size={20} color={c.TEXT_PRIMARY} />
              </TouchableOpacity>
              <Text style={[s.headerTitle, { color: c.TEXT_PRIMARY, marginLeft: 14, flex: 1 }]}>Detalle del miembro</Text>
              <TouchableOpacity onPress={() => setEditingMember(selected)} style={[s.backBtn, { backgroundColor: c.BACKGROUND_CARD_2, borderColor: c.BORDER, marginRight: 8 }]}>
                <Ionicons name="pencil-outline" size={18} color={c.TEXT_PRIMARY} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(selected)} style={[s.backBtn, { backgroundColor: `${c.ACCENT_RED}18`, borderColor: `${c.ACCENT_RED}44` }]}>
                <Ionicons name="trash-outline" size={18} color={c.ACCENT_RED} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
              {/* Profile */}
              <View style={[s.profileCard, { backgroundColor: c.BACKGROUND_CARD, borderColor: c.BORDER }]}>
                <Avatar initials={selected.initials} size="lg" color={selected.role === 'owner' ? c.ACCENT_PURPLE : selected.role === 'supervisor' ? c.ACCENT_CYAN : c.SUCCESS} />
                <Text style={[s.profileName, { color: c.TEXT_PRIMARY }]}>{selected.name}</Text>
                <Text style={[s.profileEmail, { color: c.TEXT_SECONDARY }]}>{selected.email || 'Sin email'}</Text>
                <View style={[s.rolePill, {
                  backgroundColor: `${selected.role === 'owner' ? c.ACCENT_PURPLE : selected.role === 'supervisor' ? c.ACCENT_CYAN : c.SUCCESS}18`,
                  borderColor: `${selected.role === 'owner' ? c.ACCENT_PURPLE : selected.role === 'supervisor' ? c.ACCENT_CYAN : c.SUCCESS}40`,
                  marginTop: 10,
                }]}>
                  <Text style={{ color: selected.role === 'owner' ? c.ACCENT_PURPLE : selected.role === 'supervisor' ? c.ACCENT_CYAN : c.SUCCESS, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
                    {ROLE_CONFIG[selected.role].label}
                  </Text>
                </View>
              </View>

              {/* Active toggle */}
              <View style={[s.matrixCard, { backgroundColor: c.BACKGROUND_CARD, borderColor: c.BORDER, marginTop: 16, padding: 16, flexDirection: 'row', alignItems: 'center' }]}>
                <Text style={{ flex: 1, color: c.TEXT_PRIMARY, fontSize: 14, fontFamily: 'Inter_400Regular' }}>Miembro activo</Text>
                <Switch
                  value={selected.active}
                  onValueChange={(v) => updateMember(selected.id, { active: v })}
                  trackColor={{ false: c.BORDER, true: `${c.ACCENT_PURPLE}80` }}
                  thumbColor={selected.active ? c.ACCENT_PURPLE : c.TEXT_SECONDARY}
                />
              </View>

              {/* Permissions */}
              <Text style={[s.sectionTitle, { color: c.TEXT_SECONDARY, marginTop: 20, marginBottom: 10 }]}>Permisos</Text>
              <View style={[s.matrixCard, { backgroundColor: c.BACKGROUND_CARD, borderColor: c.BORDER }]}>
                {PERM_BY_ROLE[selected.role].map((perm, i) => (
                  <View key={i} style={[s.permRow, i === PERM_BY_ROLE[selected.role].length - 1 && { borderBottomWidth: 0 }, { borderBottomColor: c.BORDER }]}>
                    <Ionicons name={perm.allowed ? 'checkmark-circle' : 'close-circle'} size={18} color={perm.allowed ? c.SUCCESS : c.BORDER} />
                    <Text style={[s.permLabel, { color: perm.allowed ? c.TEXT_PRIMARY : c.TEXT_SECONDARY }]}>{perm.label}</Text>
                  </View>
                ))}
              </View>

              {/* Store assignment */}
              <Text style={[s.sectionTitle, { color: c.TEXT_SECONDARY, marginTop: 20, marginBottom: 10 }]}>Tienda asignada</Text>
              <View style={[s.matrixCard, { backgroundColor: c.BACKGROUND_CARD, borderColor: c.BORDER, padding: 16 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[s.roleStatIcon, { backgroundColor: `${c.ACCENT_PURPLE}18` }]}>
                    <Ionicons name="business-outline" size={18} color={c.ACCENT_PURPLE} />
                  </View>
                  <Text style={{ color: c.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
                    {storeNameFor(selected.storeId)}
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Add member */}
      <MemberFormSheet
        visible={addModal}
        onClose={() => setAddModal(false)}
        initial={null}
        storeOptions={stores.map(st => ({ id: st.id, name: st.name }))}
        title="Agregar miembro"
        onSubmit={(data) => addMember({ ...data, password: data.password ?? '', active: true })}
      />

      {/* Edit member */}
      <MemberFormSheet
        visible={!!editingMember}
        onClose={() => setEditingMember(null)}
        initial={editingMember}
        storeOptions={stores.map(st => ({ id: st.id, name: st.name }))}
        title="Editar miembro"
        onSubmit={(data) => editingMember ? updateMember(editingMember.id, data) : Promise.resolve()}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  headerSub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  sectionTitle: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.2 },
  roleStat: { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1 },
  roleStatIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  roleStatCount: { fontSize: 22, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  roleStatLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  matrixCard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  matrixRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1 },
  matrixHeader: { fontSize: 11, fontWeight: '700', fontFamily: 'Inter_700Bold', textAlign: 'center', flex: 1, textTransform: 'uppercase' },
  matrixPerm: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  card: { borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 10 },
  activeDot: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  memberName: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  memberEmail: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  storeText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, alignSelf: 'center' },
  roleLabel: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  inactiveLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 4 },
  profileCard: { borderRadius: 20, padding: 20, borderWidth: 1, alignItems: 'center' },
  profileName: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', marginTop: 12 },
  profileEmail: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 3 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
  permLabel: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  addSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '88%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 16 },
});
