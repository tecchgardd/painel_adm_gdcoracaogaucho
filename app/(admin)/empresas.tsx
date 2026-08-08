import { useCallback, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { AppModal, Button, FloatingActionButton, FormField, Header, Screen } from '@/components/ui';
import { EmptyState } from '@/components/crud/EmptyState';
import { ErrorState } from '@/components/crud/ErrorState';
import { LoadingState } from '@/components/crud/LoadingState';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, theme } from '@/theme/theme';
import { createEmpresa, deleteEmpresa, listEmpresas, updateEmpresa, type Empresa } from '@/services/empresas.service';

export default function Empresas() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [editing, setEditing] = useState<Empresa | null | undefined>(undefined);
  const [nome, setNome] = useState('');
  const [file, setFile] = useState<File>();
  const [errorMessage, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Empresa | null>(null);
  const { numColumns } = useResponsive();
  const itemWidth = numColumns === 1 ? '100%' : numColumns === 2 ? '48.5%' : '32%';
  const query = useCallback(() => listEmpresas(), []);
  const { data, loading, error, refetch } = useApiQuery(query, { fallbackData: [] });
  const empresas = data ?? [];

  function open(item?: Empresa) {
    setEditing(item ?? null);
    setNome(item?.nome ?? '');
    setFile(undefined);
    setError('');
  }

  async function save() {
    if (nome.trim().length < 2 || (!editing && !file)) return setError('Informe o nome e selecione uma imagem.');
    setSaving(true);
    try {
      const payload = { nome: nome.trim(), imagem: file, ativo: editing?.ativo ?? true, publicado: editing?.publicado ?? true, ordem: editing?.ordem ?? 0 };
      if (editing) await updateEmpresa(editing.id, payload);
      else await createEmpresa(payload);
      setEditing(undefined);
      refetch();
    } catch (e) {
      setError((e as { message?: string }).message ?? 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await deleteEmpresa(deleting.id);
      setDeleting(null);
      refetch();
    } catch (e) {
      setError((e as { message?: string }).message ?? 'Não foi possível excluir.');
    }
  }

  return <Screen variant="admin">
    <Header title="Empresas" right={<FloatingActionButton onPress={() => open()} accessibilityLabel="Nova empresa" />} />
    {loading ? <LoadingState label="Carregando empresas..." /> : null}
    {error ? <ErrorState message={error} onRetry={refetch} /> : null}
    {!error && <View style={styles.grid}>
      {empresas.map((item) => <View key={item.id} style={[styles.card, { width: itemWidth }]}>
        <Image source={{ uri: item.imagemUrl }} resizeMode="contain" style={styles.logo} />
        <Text style={styles.name}>{item.nome}</Text>
        <Text style={styles.status}>{item.publicado && item.ativo ? 'PUBLICADA' : 'OCULTA'}</Text>
        <View style={styles.actions}>
          <Button title="Editar" tone="green" onPress={() => open(item)} />
          <Button title="Excluir" tone="red" onPress={() => setDeleting(item)} />
        </View>
      </View>)}
    </View>}
    {!loading && !error && !empresas.length ? <EmptyState
      title="Nenhuma empresa cadastrada"
      subtitle="Cadastre patrocinadores e apoiadores para exibi-los na landing page."
    /> : null}
    {Platform.OS === 'web' && <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      style={{ display: 'none' }}
      onChange={(e) => setFile(e.target.files?.[0])}
    />}
    <AppModal
      visible={editing !== undefined}
      onClose={() => setEditing(undefined)}
      title={editing ? 'Editar empresa' : 'Nova empresa'}
      footer={<View style={styles.actions}>
        <Button title="Cancelar" tone="dark" onPress={() => setEditing(undefined)} />
        <Button title={saving ? 'Salvando...' : 'Salvar'} tone="green" onPress={saving ? undefined : save} />
      </View>}
    >
      <FormField label="Nome" value={nome} onChangeText={setNome} />
      <TouchableOpacity style={styles.picker} onPress={() => inputRef.current?.click()} accessibilityRole="button" accessibilityLabel="Selecionar imagem">
        <MaterialCommunityIcons name="image-plus" color={colors.yellow} size={24} />
        <Text style={styles.pickerText}>{file?.name ?? (editing ? 'Substituir logo/banner' : 'Selecionar logo/banner')}</Text>
      </TouchableOpacity>
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
    </AppModal>
    <AppModal
      visible={!!deleting}
      onClose={() => setDeleting(null)}
      title="Excluir empresa"
      footer={<View style={styles.actions}>
        <Button title="Cancelar" tone="dark" onPress={() => setDeleting(null)} />
        <Button title="Excluir" tone="red" onPress={remove} />
      </View>}
    >
      <Text style={styles.pickerText}>Confirma a exclusão de {deleting?.nome}? A imagem também será removida do Cloudinary.</Text>
    </AppModal>
  </Screen>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  card: { borderRadius: theme.radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 14 },
  logo: { height: 110, width: '100%', backgroundColor: '#fff', borderRadius: theme.radius.md },
  name: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 10 },
  status: { color: colors.green, fontSize: 11, fontWeight: '900', marginVertical: 8 },
  actions: { flexDirection: 'row', gap: 10 },
  error: { color: colors.red, fontWeight: '800', marginVertical: 8 },
  picker: { marginTop: 16, borderWidth: 1, borderColor: colors.border, borderRadius: theme.radius.md, padding: 16, alignItems: 'center', gap: 8 },
  pickerText: { color: colors.muted, fontWeight: '700' }
});
