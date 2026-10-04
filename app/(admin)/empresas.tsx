import { useCallback, useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { createEmpresa, deleteEmpresa, listEmpresas, updateEmpresa, type Empresa, type EmpresaImagem, type EmpresaTipo } from '@/features/empresas/services/empresas.service';
import { buildEmpresaInput, situacaoNoSite, TIPO_LABELS, toEmpresaForm, validateEmpresa, type EmpresaFormState } from '@/features/empresas/utils/empresaForm';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ErrorState } from '@/shared/components/feedback/ErrorState';
import { LoadingState } from '@/shared/components/feedback/LoadingState';
import { ActionMenu, AppModal, Button, ChoiceGroup, FilterBar, FloatingActionButton, FormField, FormRow, FormSection, Header, Screen, StatusBadge } from '@/shared/components/ui';
import { gridCellStyle, gridContainer } from '@/shared/components/ui/grid';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { colors, theme } from '@/theme/theme';
import { usePode } from '@/stores/auth.store';

const TIPO_OPTIONS = (Object.keys(TIPO_LABELS) as EmpresaTipo[]).map((value) => ({ value, label: TIPO_LABELS[value] }));
const SITUACAO_OPTIONS = [
  { value: 'TODAS', label: 'Todas' },
  { value: 'PUBLICADA', label: 'No site' },
  { value: 'AGENDADA', label: 'Agendadas' },
  { value: 'ENCERRADA', label: 'Vigência encerrada' },
  { value: 'OCULTA', label: 'Ocultas' }
];

/** Patrocinadores, apoiadores e parceiros exibidos na landing page. */
export default function Empresas() {
  const podeCriar = usePode('empresas.criar');
  const podeEditar = usePode('empresas.editar');
  const podeExcluir = usePode('empresas.excluir');
  const [editing, setEditing] = useState<Empresa | null | undefined>(undefined);
  const [form, setForm] = useState<EmpresaFormState>(toEmpresaForm());
  const [imagem, setImagem] = useState<{ arquivo: EmpresaImagem; preview: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Empresa | null>(null);
  const [busca, setBusca] = useState('');
  const [tipoFilter, setTipoFilter] = useState('TODOS');
  const [situacaoFilter, setSituacaoFilter] = useState('TODAS');
  const { numColumns } = useResponsive();
  const gridCell = gridCellStyle(numColumns);
  const query = useCallback(() => listEmpresas(), []);
  const { data, loading, error, refetch } = useApiQuery(query, { fallbackData: [] });
  const empresas = useMemo(() => (data ?? [])
    .filter((item) => (tipoFilter === 'TODOS' || item.tipo === tipoFilter)
      && (situacaoFilter === 'TODAS' || situacaoNoSite(item) === situacaoFilter)
      && item.nome.toLowerCase().includes(busca.trim().toLowerCase()))
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.nome.localeCompare(b.nome)), [busca, data, situacaoFilter, tipoFilter]);

  function open(item?: Empresa) {
    setEditing(item ?? null);
    setForm(toEmpresaForm(item));
    setImagem(null);
    setErrors({});
    setFormError('');
  }

  function patch<K extends keyof EmpresaFormState>(key: K, value: EmpresaFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return setFormError('Permissão para acessar as imagens negada.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const name = asset.fileName ?? `empresa-${Date.now()}.png`;
    // Web entrega o File; no app vai o arquivo local (uri) no FormData.
    const arquivo: EmpresaImagem = asset.file ?? { uri: asset.uri, name, type: asset.mimeType ?? 'image/jpeg' };
    setImagem({ arquivo, preview: asset.uri });
    setErrors((current) => ({ ...current, imagem: '' }));
  }

  async function save() {
    const validation = validateEmpresa(form, !!imagem || !!editing?.imagemUrl);
    setErrors(validation);
    if (Object.values(validation).some(Boolean)) return;
    setSaving(true);
    setFormError('');
    try {
      const payload = { ...buildEmpresaInput(form), imagem: imagem?.arquivo };
      if (editing) await updateEmpresa(editing.id, payload);
      else await createEmpresa(payload);
      setEditing(undefined);
      refetch();
    } catch (saveError) {
      setFormError((saveError as { message?: string })?.message ?? 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function togglePublicado(item: Empresa) {
    try {
      await updateEmpresa(item.id, { ...buildEmpresaInput(toEmpresaForm(item)), publicado: !(item.publicado && item.ativo) });
      refetch();
    } catch (toggleError) {
      setFormError((toggleError as { message?: string })?.message ?? 'Não foi possível alterar a publicação.');
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await deleteEmpresa(deleting.id);
      setDeleting(null);
      refetch();
    } catch (removeError) {
      setFormError((removeError as { message?: string })?.message ?? 'Não foi possível excluir.');
      setDeleting(null);
    }
  }

  const preview = imagem?.preview ?? editing?.imagemUrl;

  return <Screen variant="admin">
    <Header title="Empresas" subtitle="Patrocinadores, apoiadores e parceiros exibidos no site, na ordem definida aqui." right={podeCriar ? <FloatingActionButton onPress={() => open()} accessibilityLabel="Nova empresa" /> : undefined} />
    <FilterBar
      search={{ value: busca, onChange: setBusca, placeholder: 'Buscar empresa' }}
      filters={[
        { key: 'tipo', label: 'Tipo', value: tipoFilter, allValue: 'TODOS', options: [{ value: 'TODOS', label: 'Todos' }, ...TIPO_OPTIONS], onChange: setTipoFilter },
        { key: 'situacao', label: 'No site', value: situacaoFilter, allValue: 'TODAS', options: SITUACAO_OPTIONS, onChange: setSituacaoFilter }
      ]}
    />
    {formError && editing === undefined ? <Text style={styles.error}>{formError}</Text> : null}
    {loading ? <LoadingState label="Carregando empresas..." /> : null}
    {error ? <ErrorState message={error} onRetry={refetch} /> : null}
    {!error ? <View style={styles.grid}>
      {empresas.map((item) => {
        const situacao = situacaoNoSite(item);
        return <View key={item.id} style={gridCell}>
          <View style={styles.card}>
            <Pressable onPress={podeEditar ? () => open(item) : undefined} disabled={!podeEditar} accessibilityRole="button" accessibilityLabel={`Editar ${item.nome}`} style={styles.cardMain}>
              <View style={styles.logoTile}><Image source={{ uri: item.imagemUrl }} resizeMode="contain" style={styles.logo} /></View>
              <View style={styles.cardCopy}>
                <Text numberOfLines={1} style={styles.name}>{item.nome}</Text>
                <Text numberOfLines={1} style={styles.meta}>{[item.tipo ? TIPO_LABELS[item.tipo] : null, `Ordem ${item.ordem ?? 0}`, item.link?.replace(/^https?:\/\//, '')].filter(Boolean).join(' · ')}</Text>
                <View style={styles.badge}><StatusBadge status={situacao} /></View>
              </View>
            </Pressable>
            {podeEditar || podeExcluir ? <ActionMenu variant="ghost" actions={[
              ...(podeEditar ? [
                { label: 'Editar', icon: 'pencil-outline' as const, onPress: () => open(item) },
                item.publicado && item.ativo
                  ? { label: 'Ocultar do site', icon: 'eye-off-outline' as const, onPress: () => togglePublicado(item) }
                  : { label: 'Publicar no site', icon: 'eye-outline' as const, onPress: () => togglePublicado(item) }
              ] : []),
              ...(podeExcluir ? [{ label: 'Excluir', icon: 'trash-can-outline' as const, tone: 'danger' as const, onPress: () => setDeleting(item) }] : [])
            ]} /> : null}
          </View>
        </View>;
      })}
    </View> : null}
    {!loading && !error && !empresas.length ? <EmptyState
      icon="office-building-outline"
      title={(data ?? []).length ? 'Nenhuma empresa com esses filtros' : 'Nenhuma empresa cadastrada'}
      subtitle={(data ?? []).length ? 'Ajuste a busca ou os filtros.' : 'Cadastre patrocinadores e apoiadores para exibi-los na landing page.'}
    /> : null}

    <AppModal
      visible={editing !== undefined}
      onClose={() => setEditing(undefined)}
      title={editing ? 'Editar empresa' : 'Nova empresa'}
      footer={<View style={styles.footerRow}>
        <View style={styles.half}><Button title="Cancelar" tone="dark" onPress={() => setEditing(undefined)} /></View>
        <View style={styles.half}><Button title={saving ? 'Salvando...' : 'Salvar'} tone="green" disabled={saving} onPress={save} /></View>
      </View>}
    >
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      <FormSection first title="Empresa">
        <FormField required label="Nome" value={form.nome} onChangeText={(value) => patch('nome', value)} placeholder="Nome como aparece no site" error={errors.nome} />
        <Text style={styles.label}>Tipo</Text>
        <ChoiceGroup options={TIPO_OPTIONS} value={form.tipo} onChange={(value) => patch('tipo', value as EmpresaTipo)} />
        <FormField label="Link (site ou Instagram)" value={form.link} onChangeText={(value) => patch('link', value)} autoCapitalize="none" placeholder="instagram.com/empresa" hint="Ao clicar no logo, o site abre este link." error={errors.link} />
      </FormSection>

      <FormSection title="Logo" description="PNG com fundo transparente fica melhor. Veja como aparece nos fundos claro e escuro.">
        <View style={styles.previewRow}>
          <View style={[styles.previewTile, styles.previewLight]}>{preview ? <Image source={{ uri: preview }} resizeMode="contain" style={styles.previewImage} /> : <MaterialCommunityIcons name="image-outline" size={28} color="#999" />}</View>
          <View style={[styles.previewTile, styles.previewDark]}>{preview ? <Image source={{ uri: preview }} resizeMode="contain" style={styles.previewImage} /> : <MaterialCommunityIcons name="image-outline" size={28} color={colors.subtle} />}</View>
        </View>
        <View style={styles.pickButton}><Button title={preview ? 'Trocar imagem' : 'Escolher imagem'} tone="soft" onPress={pickImage} /></View>
        {errors.imagem ? <Text style={styles.error}>{errors.imagem}</Text> : null}
      </FormSection>

      <FormSection title="Exibição no site">
        <Text style={styles.label}>Publicada</Text>
        <ChoiceGroup options={[{ value: 'SIM', label: 'Sim' }, { value: 'NAO', label: 'Não (oculta)' }]} value={form.publicado ? 'SIM' : 'NAO'} onChange={(value) => patch('publicado', value === 'SIM')} />
        <FormField label="Ordem de exibição" value={form.ordem} onChangeText={(value) => patch('ordem', value.replace(/\D/g, ''))} keyboardType="numeric" hint="Menor número aparece primeiro." error={errors.ordem} />
        <FormRow>
          <FormField label="Exibir a partir de" value={form.vigenciaInicio} onChangeText={(value) => patch('vigenciaInicio', value)} placeholder="dd/mm/aaaa" keyboardType="numeric" error={errors.vigenciaInicio} />
          <FormField label="Exibir até" value={form.vigenciaFim} onChangeText={(value) => patch('vigenciaFim', value)} placeholder="dd/mm/aaaa" keyboardType="numeric" hint="Vazio = sem prazo." error={errors.vigenciaFim} />
        </FormRow>
      </FormSection>
    </AppModal>

    <AppModal
      visible={!!deleting}
      onClose={() => setDeleting(null)}
      title="Excluir empresa"
      size="sm"
      footer={<View style={styles.footerRow}>
        <View style={styles.half}><Button title="Cancelar" tone="dark" onPress={() => setDeleting(null)} /></View>
        <View style={styles.half}><Button title="Excluir" tone="red" onPress={remove} /></View>
      </View>}
    >
      <Text style={styles.confirm}>Confirma a exclusão de {deleting?.nome}? A imagem também será removida. Para tirar do site sem perder o cadastro, use “Ocultar do site”.</Text>
    </AppModal>
  </Screen>;
}

const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null;

const styles = StyleSheet.create({
  grid: gridContainer,
  card: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: theme.radius.lg, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.dark, paddingRight: 6 },
  cardMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, ...webCursor },
  logoTile: { width: 76, height: 76, borderRadius: theme.radius.md, backgroundColor: '#F4F1EA', alignItems: 'center', justifyContent: 'center', padding: 8 },
  logo: { width: '100%', height: '100%' },
  cardCopy: { flex: 1, minWidth: 0, gap: 3 },
  name: { color: colors.text, fontSize: 15, fontFamily: theme.font.semiBold },
  meta: { color: colors.subtle, fontSize: 12, fontFamily: theme.font.regular },
  badge: { marginTop: 6 },
  label: { color: colors.muted, fontSize: 12, fontFamily: theme.font.medium, marginTop: 14, marginBottom: 8 },
  previewRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  previewTile: { flex: 1, height: 110, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', padding: 14, borderWidth: 1, borderColor: colors.borderSoft },
  previewLight: { backgroundColor: '#F4F1EA' },
  previewDark: { backgroundColor: '#12301F' },
  previewImage: { width: '100%', height: '100%' },
  pickButton: { marginTop: 12, alignSelf: 'flex-start', minWidth: 200 },
  footerRow: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  error: { color: colors.red, fontFamily: theme.font.medium, marginTop: 8, marginBottom: 6 },
  confirm: { color: colors.text, lineHeight: 20, fontFamily: theme.font.regular }
});
