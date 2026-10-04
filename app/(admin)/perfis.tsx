import { useCallback, useMemo, useState } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';

import { PerfilFormModal } from '@/features/perfis/components/PerfilFormModal';
import { createPerfil, deletePerfil, listPerfis, updatePerfil } from '@/features/perfis/services/perfis.service';
import { buildPerfilPayload, PERFIS_LOCAIS, resumoPermissoes, toPerfilForm, validatePerfil, type PerfilFormState } from '@/features/perfis/utils/perfilForm';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ErrorState } from '@/shared/components/feedback/ErrorState';
import { LoadingState } from '@/shared/components/feedback/LoadingState';
import { ActionMenu, AppModal, Button, FilterBar, FloatingActionButton, Header, ListCard, Screen } from '@/shared/components/ui';
import { gridCellStyle, gridContainer } from '@/shared/components/ui/grid';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { useResponsive } from '@/shared/hooks/useResponsive';
import type { PerfilAcesso } from '@/shared/types/entities';
import { usePode } from '@/stores/auth.store';
import { colors, theme } from '@/theme/theme';

export default function Perfis() {
  const { numColumns } = useResponsive();
  const gridCell = gridCellStyle(numColumns);
  const podeCriar = usePode('perfis.criar');
  const podeEditar = usePode('perfis.editar');
  const podeExcluir = usePode('perfis.excluir');
  const query = useCallback(() => listPerfis(), []);
  const { data, loading, error, refetch } = useApiQuery(query, { fallbackData: [] });
  // Sem `/admin/perfis` no backend (404 → lista vazia), mostra os perfis padrão, que equivalem aos tipos de acesso atuais.
  const semBackend = !loading && !error && !data?.length;
  const perfis = useMemo(() => (data?.length ? data : semBackend ? PERFIS_LOCAIS : []), [data, semBackend]);
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState<PerfilFormState | null>(null);
  const [leitura, setLeitura] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [excluindo, setExcluindo] = useState<PerfilAcesso | null>(null);
  const [erroExcluir, setErroExcluir] = useState('');

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return perfis.filter((perfil) => !termo || `${perfil.nome} ${perfil.descricao ?? ''}`.toLowerCase().includes(termo));
  }, [busca, perfis]);

  function abrir(perfil: PerfilAcesso | null, modo: 'editar' | 'copiar' | 'ver') {
    setErrors({});
    setLeitura(modo === 'ver');
    setForm(toPerfilForm(perfil, modo === 'copiar'));
  }

  async function salvar() {
    if (!form) return;
    const found = validatePerfil(form, perfis);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const payload = buildPerfilPayload(form);
      if (form.id) await updatePerfil(form.id, payload);
      else await createPerfil(payload);
      setForm(null);
      refetch();
    } catch (saveError) {
      setErrors({ form: (saveError as { message?: string })?.message ?? 'Não foi possível salvar o perfil.' });
    } finally {
      setSaving(false);
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    setErroExcluir('');
    try {
      await deletePerfil(excluindo.id);
      setExcluindo(null);
      refetch();
    } catch (deleteError) {
      setErroExcluir((deleteError as { message?: string })?.message ?? 'Não foi possível excluir o perfil.');
    }
  }

  const emUso = (excluindo?.usuarios ?? 0) > 0;

  return <Screen variant="admin">
    <Header
      title="Perfis de acesso"
      subtitle="Cada colaborador tem um perfil, e o perfil define as telas que aparecem e as ações liberadas em cada uma."
      right={podeCriar && !semBackend ? <FloatingActionButton onPress={() => abrir(null, 'editar')} accessibilityLabel="Novo perfil" /> : undefined}
    />
    {semBackend ? <View style={styles.aviso}>
      <MaterialCommunityIcons name="information-outline" size={18} color={colors.goldAccent} />
      <Text style={styles.avisoTexto}>O servidor ainda não tem perfis personalizados, por isso aparecem só os três perfis padrão, sem edição. Eles equivalem aos tipos de acesso de hoje. Depois que o backend implementar o contrato em docs/backend/2026-10-03-perfis-acesso.md, será possível criar e editar perfis aqui.</Text>
    </View> : null}
    <FilterBar search={{ value: busca, onChange: setBusca, placeholder: 'Buscar perfil' }} filters={[]} />
    {loading ? <LoadingState label="Carregando perfis..." /> : null}
    {error ? <ErrorState message={error} onRetry={refetch} /> : null}
    {!loading && !error ? <View style={styles.grid}>
      {visiveis.map((perfil) => {
        const travado = perfil.sistema || semBackend;
        const usuarios = typeof perfil.usuarios === 'number' ? ` · ${perfil.usuarios} colaborador${perfil.usuarios === 1 ? '' : 'es'}` : '';
        return <View key={perfil.id} style={gridCell}>
          <ListCard
            title={perfil.nome}
            subtitle={`${resumoPermissoes(perfil.permissoes)}${usuarios}${perfil.sistema ? ' · Perfil do sistema' : ''}\n${perfil.descricao ?? 'Sem descrição.'}`}
            onPress={() => abrir(perfil, travado || !podeEditar ? 'ver' : 'editar')}
            actions={<ActionMenu variant="ghost" actions={[
              { label: travado || !podeEditar ? 'Ver permissões' : 'Editar permissões', icon: travado || !podeEditar ? 'eye-outline' : 'pencil-outline', onPress: () => abrir(perfil, travado || !podeEditar ? 'ver' : 'editar') },
              ...(podeCriar && !semBackend ? [{ label: 'Duplicar', icon: 'content-copy' as const, onPress: () => abrir(perfil, 'copiar') }] : []),
              ...(podeExcluir && !travado ? [{ label: 'Excluir perfil', icon: 'delete-outline' as const, tone: 'danger' as const, onPress: () => { setErroExcluir(''); setExcluindo(perfil); } }] : [])
            ]} />}
          />
        </View>;
      })}
    </View> : null}
    {!loading && !error && !visiveis.length ? <EmptyState icon="shield-account-outline" title="Nenhum perfil encontrado" /> : null}

    <PerfilFormModal form={form} readOnly={leitura} errors={errors} saving={saving} onClose={() => setForm(null)} onChange={setForm} onSave={salvar} />

    <AppModal
      visible={!!excluindo}
      onClose={() => setExcluindo(null)}
      size="sm"
      title="Excluir perfil"
      footer={<View style={styles.footer}>
        <View style={styles.footerItem}><Button title="Voltar" tone="dark" onPress={() => setExcluindo(null)} /></View>
        {!emUso ? <View style={styles.footerItem}><Button title="Excluir" tone="red" onPress={confirmarExclusao} /></View> : null}
      </View>}
    >
      <Text style={styles.confirm}>{emUso
        ? `O perfil ${excluindo?.nome} ainda é usado por ${excluindo?.usuarios} colaborador(es). Troque o perfil deles em Colaboradores antes de excluir.`
        : `Excluir o perfil ${excluindo?.nome}? Essa ação não pode ser desfeita.`}</Text>
      {erroExcluir ? <Text style={styles.erro}>{erroExcluir}</Text> : null}
    </AppModal>
  </Screen>;
}

const styles = StyleSheet.create({
  grid: gridContainer,
  aviso: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderWidth: 1, borderColor: colors.goldAccentDark, backgroundColor: 'rgba(200, 144, 43, 0.08)', borderRadius: theme.radius.md, padding: 12, marginBottom: 14 },
  avisoTexto: { flex: 1, color: colors.text, fontSize: 12, lineHeight: 18, fontFamily: theme.font.regular },
  footer: { flexDirection: 'row', gap: 10 },
  footerItem: { flex: 1 },
  confirm: { color: colors.text, lineHeight: 20, fontFamily: theme.font.regular },
  erro: { color: colors.red, fontFamily: theme.font.medium, marginTop: 10 }
});
