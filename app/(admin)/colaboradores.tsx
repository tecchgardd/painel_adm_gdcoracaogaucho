import { useCallback, useMemo, useState } from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { ActionMenu, AppModal, Avatar, Button, ChoiceGroup, FloatingActionButton, FormField, FormRow, FormSection, Header, InfoList, InfoRow, FilterBar, ListCard, Screen, StatusBadge } from '@/shared/components/ui';
import { gridCellStyle, gridContainer } from '@/shared/components/ui/grid';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ErrorState } from '@/shared/components/feedback/ErrorState';
import { LoadingState } from '@/shared/components/feedback/LoadingState';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { useResponsive } from '@/shared/hooks/useResponsive';
import {
  createColaborador,
  deleteColaborador,
  listColaboradores,
  resetColaboradorPassword,
  updateColaborador
} from '@/features/colaboradores/services/colaboradores.service';
import { ColaboradorPhotoField } from '@/features/colaboradores/components/ColaboradorPhotoField';
import { PreviaMenu } from '@/features/perfis/components/PerfilFormModal';
import { listPerfis } from '@/features/perfis/services/perfis.service';
import { PERFIS_LOCAIS } from '@/features/perfis/utils/perfilForm';
import { normalizarPermissoes } from '@/core/permissions/permissoes';
import { usePode } from '@/stores/auth.store';
import {
  buildColaboradorPayload,
  colaboradorPhoto,
  colaboradorUsername,
  emptyColaboradorForm,
  nomePerfilDoColaborador,
  normalizeUsername,
  perfilIdDoColaborador,
  suggestUsername,
  toColaboradorForm,
  validateColaborador,
  type ColaboradorFormState
} from '@/features/colaboradores/utils/colaboradorForm';
import { formatDateTime } from '@/shared/utils/format';
import { colors, theme } from '@/theme/theme';
import type { Colaborador } from '@/shared/types/entities';

const optionLabels: Record<string, string> = {
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  TEMPORARIA: 'Gerar senha temporária',
  MANUAL: 'Definir manualmente'
};

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
    <ChoiceGroup options={options.map((option) => ({ value: option, label: optionLabels[option] ?? option }))} value={value} onChange={(next) => onChange(next as T)} />
  </View>;
}

export default function Colaboradores() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Colaborador | null>(null);
  const [editing, setEditing] = useState<ColaboradorFormState | null>(null);
  const [deleting, setDeleting] = useState<Colaborador | null>(null);
  const [toggling, setToggling] = useState<Colaborador | null>(null);
  const [roleFilter, setRoleFilter] = useState('TODOS');
  const [statusFilter, setStatusFilter] = useState('ATIVO');
  const [saving, setSaving] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { numColumns } = useResponsive();
  const gridCell = gridCellStyle(numColumns);
  const queryColaboradores = useCallback(() => listColaboradores(), []);
  const { data, loading, error, refetch } = useApiQuery(queryColaboradores, { fallbackData: [] });
  const colaboradores = useMemo(() => data ?? [], [data]);
  const podeCriar = usePode('colaboradores.criar');
  const podeEditar = usePode('colaboradores.editar');
  const podeExcluir = usePode('colaboradores.excluir');
  const queryPerfis = useCallback(() => listPerfis(), []);
  const { data: perfisApi } = useApiQuery(queryPerfis, { fallbackData: [] });
  // Sem `/admin/perfis` no backend, os perfis padrão (equivalentes ao `role`) continuam valendo.
  const perfisDoBackend = !!perfisApi?.length;
  const perfis = useMemo(() => (perfisApi?.length ? perfisApi : PERFIS_LOCAIS), [perfisApi]);
  const perfilSelecionado = perfis.find((perfil) => perfil.id === editing?.perfilId) ?? null;
  const filtered = useMemo(() => colaboradores.filter((colaborador: Colaborador) =>
    (roleFilter === 'TODOS' || perfilIdDoColaborador(colaborador) === roleFilter)
    && (statusFilter === 'TODOS' || String(colaborador.status ?? 'ATIVO').toUpperCase() === statusFilter)
    && `${colaborador.nome ?? ''} ${colaborador.cpf ?? ''} ${colaborador.email ?? ''} ${colaboradorUsername(colaborador) ?? ''}`
      .toLowerCase()
      .includes(query.toLowerCase())
  ), [colaboradores, query, roleFilter, statusFilter]);

  function openNew() {
    setEditing({ ...emptyColaboradorForm });
    setFormError('');
    setFieldErrors({});
  }

  function openEdit(colaborador: Colaborador) {
    setEditing(toColaboradorForm(colaborador));
    setSelected(null);
    setFormError('');
    setFieldErrors({});
  }

  function patch<K extends keyof ColaboradorFormState>(key: K, value: ColaboradorFormState[K]) {
    setEditing((current) => current ? { ...current, [key]: value } : current);
  }

  async function save() {
    if (!editing) return;
    const errors = validateColaborador(editing);
    setFieldErrors(errors);
    setFormError('');
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      if (editing.id) {
        await updateColaborador(editing.id, buildColaboradorPayload(editing, perfilSelecionado, perfisDoBackend));
      } else {
        const response = await createColaborador(buildColaboradorPayload(editing, perfilSelecionado, perfisDoBackend));
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

  /** Desativar preserva o histórico (Registro de atividades, vendas feitas); o acesso é bloqueado. */
  async function confirmToggle() {
    if (!toggling) return;
    const ativo = String(toggling.status ?? 'ATIVO').toUpperCase() !== 'INATIVO';
    try {
      await updateColaborador(String(toggling.id), { status: ativo ? 'INATIVO' : 'ATIVO' });
      setToggling(null);
      refetch();
    } catch (toggleError) {
      setFormError((toggleError as { message?: string })?.message ?? 'Não foi possível alterar o acesso.');
      setToggling(null);
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
    <Header title="Colaboradores" subtitle="Equipe com acesso ao painel. Desative quem saiu: o histórico do que a pessoa fez é preservado." right={podeCriar ? <FloatingActionButton onPress={openNew} accessibilityLabel="Novo colaborador" /> : undefined} />
    <FilterBar
      search={{ value: query, onChange: setQuery, placeholder: 'Buscar por nome, usuário, e-mail ou CPF' }}
      filters={[
        { key: 'perfil', label: 'Perfil', value: roleFilter, allValue: 'TODOS', options: [{ value: 'TODOS', label: 'Todos' }, ...perfis.map((perfil) => ({ value: perfil.id, label: perfil.nome }))], onChange: setRoleFilter },
        { key: 'status', label: 'Situação', value: statusFilter, allValue: 'ATIVO', options: [{ value: 'ATIVO', label: 'Ativos' }, { value: 'INATIVO', label: 'Desativados' }, { value: 'TODOS', label: 'Todos' }], onChange: setStatusFilter }
      ]}
    />
    {formError ? <Text style={styles.formError}>{formError}</Text> : null}
    {loading ? <LoadingState label="Carregando colaboradores..." /> : null}
    {error ? <ErrorState message={error} onRetry={refetch} /> : null}
    {!error && <View style={styles.grid}>
      {filtered.map((colaborador: Colaborador) => {
        const title = colaborador.nome ?? colaborador.name ?? 'Colaborador sem nome';
        const username = colaboradorUsername(colaborador);
        const photo = colaboradorPhoto(colaborador);
        const subtitle = `${username ? `@${username} · ` : ''}${colaborador.email ?? colaborador.user?.email ?? '-'}\n${nomePerfilDoColaborador(colaborador, perfis) ?? '-'}`;
        return <View key={String(colaborador.id)} style={gridCell}>
          <ListCard title={title} subtitle={subtitle} status={colaborador.status} image={photo ? { uri: photo } : undefined} onPress={() => setSelected(colaborador)}
            actions={<ActionMenu variant="ghost" actions={[
            { label: 'Ver colaborador', icon: 'account-eye-outline', onPress: () => setSelected(colaborador) },
            ...(podeEditar ? [
              { label: 'Editar acesso', icon: 'pencil-outline' as const, onPress: () => openEdit(colaborador) },
              { label: resettingId === String(colaborador.id) ? 'Resetando...' : 'Resetar senha', icon: 'lock-reset' as const, onPress: () => resetPassword(colaborador) },
              String(colaborador.status ?? 'ATIVO').toUpperCase() === 'INATIVO'
                ? { label: 'Reativar acesso', icon: 'account-check-outline' as const, onPress: () => setToggling(colaborador) }
                : { label: 'Desativar acesso', icon: 'account-cancel-outline' as const, tone: 'danger' as const, onPress: () => setToggling(colaborador) }
            ] : []),
            ...(podeExcluir ? [{ label: 'Excluir definitivamente', icon: 'delete-outline' as const, tone: 'danger' as const, onPress: () => setDeleting(colaborador) }] : [])
          ]} />}
          />
        </View>;
      })}
    </View>}
    {!loading && !error && !filtered.length ? <EmptyState icon="account-search-outline" title="Nenhum colaborador encontrado" subtitle={statusFilter === 'ATIVO' ? 'Desativados ficam no filtro "Situação".' : undefined} /> : null}
    <AppModal
      visible={!!toggling}
      onClose={() => setToggling(null)}
      title={String(toggling?.status ?? 'ATIVO').toUpperCase() === 'INATIVO' ? 'Reativar acesso' : 'Desativar acesso'}
      size="sm"
      footer={<View style={styles.footer}>
        <View style={styles.footerItem}><Button title="Cancelar" tone="dark" onPress={() => setToggling(null)} /></View>
        <View style={styles.footerItem}><Button title={String(toggling?.status ?? 'ATIVO').toUpperCase() === 'INATIVO' ? 'Reativar' : 'Desativar'} tone="red" onPress={confirmToggle} /></View>
      </View>}
    >
      <Text style={styles.detail}>{String(toggling?.status ?? 'ATIVO').toUpperCase() === 'INATIVO'
        ? `${toggling?.nome ?? 'O colaborador'} volta a entrar no painel com o mesmo usuário.`
        : `${toggling?.nome ?? 'O colaborador'} deixa de entrar no painel. O histórico do que fez (vendas, check-ins, registros) continua disponível.`}</Text>
    </AppModal>

    <AppModal visible={!!selected} onClose={() => setSelected(null)} title={selected?.nome ?? 'Colaborador'}>
      {selected ? <>
        <View style={styles.profileHeader}>
          {colaboradorPhoto(selected) ? <Image source={{ uri: colaboradorPhoto(selected) }} style={styles.profilePhoto} /> : <Avatar name={selected.nome} size={64} />}
          <View style={styles.profileCopy}>
            {colaboradorUsername(selected) ? <Text style={styles.profileUsername}>@{colaboradorUsername(selected)}</Text> : null}
            {selected.status ? <StatusBadge status={selected.status} /> : null}
          </View>
        </View>
        <InfoList>
          <InfoRow label="CPF" value={selected.cpf} />
          <InfoRow label="Usuário de login" value={colaboradorUsername(selected)} />
          <InfoRow label="E-mail de login" value={selected.email ?? selected.user?.email} />
          <InfoRow label="Perfil de acesso" value={nomePerfilDoColaborador(selected, perfis)} />
          <InfoRow label="Usuário vinculado" value={selected.userId ?? selected.user?.id} />
          {(selected as any).ultimoAcesso ? <InfoRow label="Último acesso" value={formatDateTime((selected as any).ultimoAcesso)} /> : null}
        </InfoList>
        <FormSection title="O que vê no painel" description="Menu de quem tem este perfil.">
          <PreviaMenu permissoes={normalizarPermissoes(perfis.find((perfil) => perfil.id === perfilIdDoColaborador(selected))?.permissoes ?? [])} />
        </FormSection>
        {podeEditar ? <View style={styles.detailAction}><Button title="Editar acesso" tone="green" onPress={() => openEdit(selected)} /></View> : null}
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
        <FormSection first title="Dados pessoais">
          <ColaboradorPhotoField
            nome={editing.nome}
            value={editing.fotoUrl}
            onChange={(url) => setEditing((current) => current ? { ...current, fotoUrl: url, fotoRemovida: false } : current)}
            onRemove={() => setEditing((current) => current ? { ...current, fotoUrl: '', fotoRemovida: true } : current)}
          />
          <FormRow>
            <FormField
              required
              label="Nome completo"
              value={editing.nome}
              onChangeText={(value) => patch('nome', value)}
              onBlur={() => { if (!editing.username) patch('username', suggestUsername(editing.nome)); }}
              placeholder="Nome e sobrenome"
              error={fieldErrors.nome}
            />
            <FormField required label="CPF" value={editing.cpf} onChangeText={(value) => patch('cpf', value)} keyboardType="numeric" placeholder="000.000.000-00" error={fieldErrors.cpf} />
          </FormRow>
        </FormSection>

        <FormSection title="Acesso ao sistema" description="Define como o colaborador entra no painel e o que pode ver.">
          <FormRow>
            <FormField
              required
              label="Usuário"
              value={editing.username}
              onChangeText={(value) => patch('username', normalizeUsername(value))}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="maria.fernandes"
              hint="O colaborador entra com o usuário ou o e-mail, mais a senha."
              error={fieldErrors.username}
            />
            <FormField required label="E-mail de login" value={editing.email} onChangeText={(value) => patch('email', value)} keyboardType="email-address" autoCapitalize="none" placeholder="nome@email.com" error={fieldErrors.email} />
          </FormRow>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Perfil de acesso</Text>
            <ChoiceGroup options={perfis.map((perfil) => ({ value: perfil.id, label: perfil.nome }))} value={editing.perfilId} onChange={(value) => patch('perfilId', value)} />
            {perfilSelecionado?.descricao ? <Text style={styles.perfilHint}>{perfilSelecionado.descricao} As permissões de cada perfil ficam em Perfis de acesso.</Text> : null}
          </View>
          {fieldErrors.perfilId ? <Text style={styles.fieldError}>{fieldErrors.perfilId}</Text> : null}
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
        </FormSection>
      </> : null}
    </AppModal>

    <AppModal visible={!!temporaryPassword} onClose={() => { setTemporaryPassword(''); setCopyMessage(''); }} title="Senha temporária" size="sm">
      <Text style={styles.detail}>Esta senha será exibida apenas uma vez.</Text>
      <View style={styles.passwordBox}><Text selectable style={styles.passwordText}>{temporaryPassword}</Text></View>
      {copyMessage ? <Text style={styles.state}>{copyMessage}</Text> : null}
      <Button title="Copiar senha" tone="green" onPress={copyPassword} />
    </AppModal>

    <AppModal
      visible={!!deleting}
      onClose={() => setDeleting(null)}
      title="Excluir colaborador"
      size="sm"
      footer={<View style={styles.footer}>
        <View style={styles.footerItem}><Button title="Cancelar" tone="dark" onPress={() => setDeleting(null)} /></View>
        <View style={styles.footerItem}><Button title="Excluir" tone="red" onPress={confirmDelete} /></View>
      </View>}
    >
      <Text style={styles.detail}>Excluir apaga o colaborador e o usuário de acesso. Para quem só saiu da equipe, prefira “Desativar acesso”, que preserva o histórico.</Text>
    </AppModal>
  </Screen>;
}

const styles = StyleSheet.create({
  perfilHint: { color: colors.muted, fontSize: 12, lineHeight: 17, fontFamily: theme.font.regular, marginTop: 6 },
  grid: gridContainer,
  state: { color: colors.muted, textAlign: 'center', marginVertical: 16 },
  formError: { color: colors.red, fontFamily: theme.font.semiBold, marginBottom: 10 },
  fieldError: { color: colors.red, marginTop: -8, marginBottom: 10, fontSize: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  profilePhoto: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.card },
  profileCopy: { flex: 1, minWidth: 0, gap: 6 },
  profileUsername: { color: colors.muted, fontSize: 14, fontFamily: theme.font.medium },
  detailAction: { marginTop: 16 },
  detail: { color: colors.text, lineHeight: 22, marginBottom: 8 },
  fieldBlock: { marginTop: 14 },
  fieldLabel: { color: colors.muted, fontSize: 12, fontFamily: theme.font.medium, marginBottom: 8 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 12 },
  checkText: { color: colors.text, fontFamily: theme.font.semiBold, flex: 1 },
  lockedBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#17351D', borderWidth: 1, borderColor: colors.green, borderRadius: 12, padding: 12, marginTop: 4 },
  lockedText: { color: colors.text, flex: 1, lineHeight: 20 },
  passwordBox: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.green, borderRadius: 12, padding: 14, marginVertical: 12 },
  passwordText: { color: colors.text, fontSize: 18, fontFamily: theme.font.semiBold, textAlign: 'center' },
  footer: { flexDirection: 'row', gap: 10 },
  footerItem: { flex: 1 }
});
