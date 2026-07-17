import { useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActionMenu, AppModal, Button, FormField, Header, ListCard, Screen, SearchBar, StatusBadge } from '@/components/ui';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useResponsive } from '@/hooks/useResponsive';
import {
  createColaborador,
  deleteColaborador,
  listColaboradores,
  resetColaboradorPassword,
  updateColaborador,
  type ColaboradorPayload
} from '@/services/colaboradores.service';
import { colors } from '@/theme/colors';
import type { Colaborador } from '@/types/entities';

type FormState = {
  id?: string;
  nome: string;
  cpf: string;
  email: string;
  role: 'STAFF' | 'ADMIN';
  status: 'ATIVO' | 'INATIVO';
  password: string;
  generateTemporaryPassword: boolean;
  mustChangePassword: boolean;
};

const emptyForm: FormState = {
  nome: '',
  cpf: '',
  email: '',
  role: 'STAFF',
  status: 'ATIVO',
  password: '',
  generateTemporaryPassword: true,
  mustChangePassword: true
};

function normalizeCpf(value?: string) {
  return String(value ?? '').replace(/\D/g, '');
}

function toForm(colaborador?: Colaborador): FormState {
  if (!colaborador) return emptyForm;
  return {
    id: String(colaborador.id),
    nome: colaborador.nome ?? colaborador.name ?? '',
    cpf: colaborador.cpf ?? '',
    email: colaborador.email ?? colaborador.user?.email ?? '',
    role: colaborador.role === 'ADMIN' ? 'ADMIN' : 'STAFF',
    status: colaborador.status === 'INATIVO' ? 'INATIVO' : 'ATIVO',
    password: '',
    generateTemporaryPassword: true,
    mustChangePassword: colaborador.user?.mustChangePassword ?? true
  };
}

function validate(form: FormState) {
  const errors: Record<string, string> = {};
  if (form.nome.trim().length < 2) errors.nome = 'Informe o nome completo.';
  if (normalizeCpf(form.cpf).length !== 11) errors.cpf = 'Informe um CPF válido.';
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Informe um email de login válido.';
  if (!['STAFF', 'ADMIN'].includes(form.role)) errors.role = 'Selecione STAFF ou ADMIN.';
  if (!form.id && !form.generateTemporaryPassword && form.password.length < 8) errors.password = 'A senha manual deve ter pelo menos 8 caracteres.';
  return errors;
}

function buildPayload(form: FormState): ColaboradorPayload {
  const payload: ColaboradorPayload = {
    nome: form.nome.trim(),
    cpf: normalizeCpf(form.cpf),
    email: form.email.trim().toLowerCase(),
    role: form.role,
    status: form.status
  };

  if (!form.id) {
    payload.generateTemporaryPassword = form.generateTemporaryPassword;
    payload.mustChangePassword = form.mustChangePassword;
    if (!form.generateTemporaryPassword) payload.password = form.password;
  }

  return payload;
}

function OptionGroup<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
}) {
  return <View style={styles.fieldBlock}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.options}>
      {options.map((option) => (
        <TouchableOpacity key={option} style={[styles.option, value === option && styles.optionActive]} onPress={() => onChange(option)}>
          <Text style={[styles.optionText, value === option && styles.optionTextActive]}>{option}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>;
}

export default function Colaboradores() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Colaborador | null>(null);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [deleting, setDeleting] = useState<Colaborador | null>(null);
  const [saving, setSaving] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { numColumns } = useResponsive();
  const itemWidth = numColumns === 1 ? '100%' : numColumns === 2 ? '48.5%' : '32%';
  const queryColaboradores = useCallback(() => listColaboradores(), []);
  const { data, loading, error, refetch } = useApiQuery(queryColaboradores, { fallbackData: [] });
  const colaboradores = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(() => colaboradores.filter((colaborador: Colaborador) =>
    `${colaborador.nome ?? ''} ${colaborador.cpf ?? ''} ${colaborador.email ?? ''} ${colaborador.role ?? ''} ${colaborador.status ?? ''}`
      .toLowerCase()
      .includes(query.toLowerCase())
  ), [colaboradores, query]);

  function openNew() {
    setEditing({ ...emptyForm });
    setFormError('');
    setFieldErrors({});
  }

  function openEdit(colaborador: Colaborador) {
    setEditing(toForm(colaborador));
    setSelected(null);
    setFormError('');
    setFieldErrors({});
  }

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setEditing((current) => current ? { ...current, [key]: value } : current);
  }

  async function save() {
    if (!editing) return;
    const errors = validate(editing);
    setFieldErrors(errors);
    setFormError('');
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      if (editing.id) {
        await updateColaborador(editing.id, buildPayload(editing));
      } else {
        const response = await createColaborador(buildPayload(editing));
        if (response.temporaryPassword) setTemporaryPassword(response.temporaryPassword);
      }
      setEditing(null);
      refetch();
    } catch (saveError) {
      setFormError((saveError as { message?: string })?.message ?? 'Não foi possível salvar o colaborador.');
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(colaborador: Colaborador) {
    const id = String(colaborador.id);
    setResettingId(id);
    setFormError('');
    try {
      const response = await resetColaboradorPassword(id);
      setTemporaryPassword(response.temporaryPassword ?? '');
      refetch();
    } catch (resetError) {
      setFormError((resetError as { message?: string })?.message ?? 'Não foi possível resetar a senha.');
    } finally {
      setResettingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteColaborador(String(deleting.id));
      setDeleting(null);
      refetch();
    } catch (deleteError) {
      setFormError((deleteError as { message?: string })?.message ?? 'Não foi possível remover o colaborador.');
    }
  }

  async function copyPassword() {
    if (!temporaryPassword) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopyMessage('Senha copiada.');
      return;
    }
    setCopyMessage('Copie a senha exibida antes de fechar.');
  }

  return <Screen variant="admin">
    <Header title="Colaboradores" right={<TouchableOpacity onPress={openNew} style={styles.plus}><MaterialCommunityIcons name="plus" color="#fff" size={24} /></TouchableOpacity>} />
    <SearchBar value={query} onChangeText={setQuery} placeholder="Pesquisar colaboradores" />
    {formError ? <Text style={styles.formError}>{formError}</Text> : null}
    {loading ? <Text style={styles.state}>Carregando colaboradores...</Text> : null}
    {error ? <TouchableOpacity onPress={refetch} style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Text style={styles.retry}>Tentar novamente</Text></TouchableOpacity> : null}
    {!error && <View style={styles.grid}>
      {filtered.map((colaborador: Colaborador) => {
        const title = colaborador.nome ?? colaborador.name ?? 'Colaborador sem nome';
        const subtitle = `${colaborador.cpf ?? '-'}\n${colaborador.email ?? colaborador.user?.email ?? '-'} | ${colaborador.role ?? '-'}`;
        return <View key={String(colaborador.id)} style={[styles.row, { width: itemWidth }]}>
          <View style={styles.rowCard}>
            <ListCard title={title} subtitle={subtitle} status={colaborador.status} onPress={() => setSelected(colaborador)} />
          </View>
          <ActionMenu actions={[
            { label: 'Ver colaborador', icon: 'account-eye-outline', onPress: () => setSelected(colaborador) },
            { label: 'Editar acesso', icon: 'pencil-outline', onPress: () => openEdit(colaborador) },
            { label: resettingId === String(colaborador.id) ? 'Resetando...' : 'Resetar senha', icon: 'lock-reset', onPress: () => resetPassword(colaborador) },
            { label: 'Remover colaborador', icon: 'delete-outline', tone: 'danger', onPress: () => setDeleting(colaborador) }
          ]} />
        </View>;
      })}
    </View>}
    {!loading && !error && !filtered.length ? <Text style={styles.state}>Nenhum colaborador encontrado.</Text> : null}

    <AppModal visible={!!selected} onClose={() => setSelected(null)} title={selected?.nome ?? 'Colaborador'}>
      {selected ? <>
        <View style={styles.sheetHeader}>
          <Text style={styles.title}>{selected.nome}</Text>
          {selected.status ? <StatusBadge status={selected.status} /> : null}
        </View>
        <Text style={styles.detail}>CPF: {selected.cpf ?? '-'}</Text>
        <Text style={styles.detail}>Email de login: {selected.email ?? selected.user?.email ?? '-'}</Text>
        <Text style={styles.detail}>Tipo de acesso: {selected.role ?? '-'}</Text>
        <Text style={styles.detail}>Usuário vinculado: {selected.userId ?? selected.user?.id ?? '-'}</Text>
        <Button title="Editar acesso" tone="green" onPress={() => openEdit(selected)} />
      </> : null}
    </AppModal>

    <AppModal
      visible={!!editing}
      onClose={() => setEditing(null)}
      title={editing?.id ? 'Editar colaborador' : 'Novo colaborador'}
      footer={<View style={styles.footer}>
        <View style={styles.footerItem}><Button title="Cancelar" tone="dark" onPress={() => setEditing(null)} /></View>
        <View style={styles.footerItem}><Button title={saving ? 'Salvando...' : 'Salvar'} tone="green" onPress={saving ? undefined : save} /></View>
      </View>}
    >
      {editing ? <>
        {formError ? <Text style={styles.formError}>{formError}</Text> : null}
        <FormField label="Nome completo" value={editing.nome} onChangeText={(value) => patch('nome', value)} />
        {fieldErrors.nome ? <Text style={styles.fieldError}>{fieldErrors.nome}</Text> : null}
        <FormField label="CPF" value={editing.cpf} onChangeText={(value) => patch('cpf', value)} keyboardType="numeric" placeholder="000.000.000-00" />
        {fieldErrors.cpf ? <Text style={styles.fieldError}>{fieldErrors.cpf}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acesso ao sistema</Text>
          <FormField label="Email de login" value={editing.email} onChangeText={(value) => patch('email', value)} keyboardType="email-address" autoCapitalize="none" />
          {fieldErrors.email ? <Text style={styles.fieldError}>{fieldErrors.email}</Text> : null}
          <OptionGroup label="Tipo de acesso" value={editing.role} options={['STAFF', 'ADMIN']} onChange={(value) => patch('role', value)} />
          {fieldErrors.role ? <Text style={styles.fieldError}>{fieldErrors.role}</Text> : null}
          <OptionGroup label="Status" value={editing.status} options={['ATIVO', 'INATIVO']} onChange={(value) => patch('status', value)} />

          {!editing.id ? <>
            <OptionGroup
              label="Senha"
              value={editing.generateTemporaryPassword ? 'TEMPORARIA' : 'MANUAL'}
              options={['TEMPORARIA', 'MANUAL']}
              onChange={(value) => patch('generateTemporaryPassword', value === 'TEMPORARIA')}
            />
            {!editing.generateTemporaryPassword ? <>
              <FormField label="Definir senha manual" value={editing.password} onChangeText={(value) => patch('password', value)} secureTextEntry />
              {fieldErrors.password ? <Text style={styles.fieldError}>{fieldErrors.password}</Text> : null}
            </> : null}
            <TouchableOpacity style={styles.checkRow} onPress={() => patch('mustChangePassword', !editing.mustChangePassword)}>
              <MaterialCommunityIcons name={editing.mustChangePassword ? 'checkbox-marked' : 'checkbox-blank-outline'} color={colors.green} size={22} />
              <Text style={styles.checkText}>Exigir alteração no primeiro acesso</Text>
            </TouchableOpacity>
          </> : <View style={styles.lockedBox}>
            <MaterialCommunityIcons name="link-variant" color={colors.green} size={22} />
            <Text style={styles.lockedText}>Usuário vinculado obrigatório. Use “Resetar senha” para gerar uma nova senha temporária.</Text>
          </View>}
        </View>
      </> : null}
    </AppModal>

    <AppModal visible={!!temporaryPassword} onClose={() => { setTemporaryPassword(''); setCopyMessage(''); }} title="Senha temporária">
      <Text style={styles.detail}>Esta senha será exibida apenas uma vez.</Text>
      <View style={styles.passwordBox}><Text selectable style={styles.passwordText}>{temporaryPassword}</Text></View>
      {copyMessage ? <Text style={styles.state}>{copyMessage}</Text> : null}
      <Button title="Copiar senha" tone="green" onPress={copyPassword} />
    </AppModal>

    <AppModal
      visible={!!deleting}
      onClose={() => setDeleting(null)}
      title="Confirmar remoção"
      footer={<View style={styles.footer}>
        <View style={styles.footerItem}><Button title="Cancelar" tone="dark" onPress={() => setDeleting(null)} /></View>
        <View style={styles.footerItem}><Button title="Remover" tone="red" onPress={confirmDelete} /></View>
      </View>}
    >
      <Text style={styles.detail}>Ao remover o colaborador, o usuário de acesso vinculado também será removido.</Text>
    </AppModal>
  </Screen>;
}

const styles = StyleSheet.create({
  plus: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  rowCard: { flex: 1 },
  state: { color: colors.muted, textAlign: 'center', marginVertical: 16 },
  errorBox: { backgroundColor: '#3A1717', borderWidth: 1, borderColor: colors.red, borderRadius: 12, padding: 14, marginBottom: 12 },
  errorText: { color: colors.text, fontWeight: '700' },
  retry: { color: colors.yellow, marginTop: 4, fontWeight: '700' },
  formError: { color: colors.red, fontWeight: '700', marginBottom: 10 },
  fieldError: { color: colors.red, marginTop: -8, marginBottom: 10, fontSize: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', flex: 1 },
  detail: { color: colors.text, lineHeight: 22, marginBottom: 8 },
  section: { borderTopWidth: 1, borderColor: colors.border, marginTop: 12, paddingTop: 14 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  fieldBlock: { marginBottom: 12 },
  fieldLabel: { color: colors.text, fontWeight: '700', marginBottom: 8 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.card },
  optionActive: { backgroundColor: colors.green, borderColor: colors.green },
  optionText: { color: colors.text, fontWeight: '700' },
  optionTextActive: { color: '#fff' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 12 },
  checkText: { color: colors.text, fontWeight: '700', flex: 1 },
  lockedBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#17351D', borderWidth: 1, borderColor: colors.green, borderRadius: 12, padding: 12, marginTop: 4 },
  lockedText: { color: colors.text, flex: 1, lineHeight: 20 },
  passwordBox: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.green, borderRadius: 12, padding: 14, marginVertical: 12 },
  passwordText: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  footer: { flexDirection: 'row', gap: 10 },
  footerItem: { flex: 1 }
});
