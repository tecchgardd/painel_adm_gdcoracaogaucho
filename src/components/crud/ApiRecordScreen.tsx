import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { z } from 'zod';
import { ActionMenu, AppModal, Button, FormField, Header, ListCard, Screen, SearchBar, StatusBadge } from '@/components/ui';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useResponsive } from '@/hooks/useResponsive';
import { buscarEnderecoPorCep } from '@/services/cep.service';
import { colors } from '@/theme/colors';

export type ApiField = {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad' | 'decimal-pad';
  options?: string[];
};

type CrudApi = {
  list: () => Promise<any[]>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  remove?: (id: string) => Promise<any>;
};

function normalizeItem(item: any, primaryKey: string, secondaryKeys: string[]) {
  const title = item.nome ?? item.name ?? item[primaryKey] ?? 'Registro';
  const subtitle = secondaryKeys.map((key) => item[key]).filter(Boolean).join(' - ');
  return { title, subtitle };
}

export function ApiRecordScreen({
  title,
  singular,
  fields,
  schema,
  api,
  fallbackData = [],
  searchKeys = ['nome', 'cpf', 'telefone', 'email', 'status'],
  primaryKey = 'nome',
  secondaryKeys = ['cpf', 'telefone'],
  buildPayload = (record) => record,
  normalizeRecord = (record) => record
}: {
  title: string;
  singular: string;
  fields: ApiField[];
  schema: z.ZodTypeAny;
  api: CrudApi;
  fallbackData?: any[];
  searchKeys?: string[];
  primaryKey?: string;
  secondaryKeys?: string[];
  buildPayload?: (record: any) => any;
  normalizeRecord?: (record: any) => any;
}) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { numColumns } = useResponsive();
  const itemWidth = numColumns === 1 ? '100%' : numColumns === 2 ? '48.5%' : '32%';
  const queryRecords = useCallback(() => api.list(), [api]);
  const { data, loading, error, refetch } = useApiQuery(queryRecords, { fallbackData });
  const records = useMemo(
    () => (data ?? []).map(normalizeRecord),
    [data, normalizeRecord]
  );

  const filtered = useMemo(() => records.filter((record) =>
    searchKeys.map((key) => record[key]).join(' ').toLowerCase().includes(query.toLowerCase())
  ), [records, query, searchKeys]);

  function openNew() {
    setEditing({ status: 'ATIVO' });
    setFormError('');
    setFieldErrors({});
  }

  async function patchField(key: string, value: string) {
    setEditing((current: any) => ({ ...current, [key]: value }));
    if (key !== 'cep' || value.replace(/\D/g, '').length !== 8) return;

    const address = await buscarEnderecoPorCep(value);
    if (!address) return;

    setEditing((current: any) => ({
      ...current,
      cep: value,
      rua: current?.rua || address.rua,
      bairro: current?.bairro || address.bairro,
      cidade: current?.cidade || address.cidade,
      estado: current?.estado || address.estado
    }));
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setFormError('');
    setFieldErrors({});
    const validation = schema.safeParse(editing);
    if (!validation.success) {
      const next: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        next[String(issue.path[0] ?? 'form')] = issue.message;
      });
      setFieldErrors(next);
      setSaving(false);
      return;
    }
    try {
      const payload = buildPayload(validation.data);
      if (editing.id) await api.update(String(editing.id), payload);
      else await api.create(payload);
      setEditing(null);
      refetch();
    } catch (saveError) {
      setFormError((saveError as { message?: string })?.message ?? 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting || !api.remove) return;
    try {
      await api.remove(String(deleting.id));
      setDeleting(null);
      refetch();
    } catch (deleteError) {
      setFormError((deleteError as { message?: string })?.message ?? 'Não foi possível remover.');
    }
  }

  return (
    <Screen variant="admin">
      <Header title={title} right={<TouchableOpacity onPress={openNew} style={styles.plus}><MaterialCommunityIcons name="plus" color="#fff" size={24} /></TouchableOpacity>} />
      <SearchBar value={query} onChangeText={setQuery} placeholder={`Pesquisar ${title.toLowerCase()}`} />
      {loading ? <Text style={styles.state}>Carregando...</Text> : null}
      {error ? <TouchableOpacity onPress={refetch} style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Text style={styles.retry}>Tentar novamente</Text></TouchableOpacity> : null}
      {!error && <View style={styles.grid}>
        {filtered.map((record) => {
          const normalized = normalizeItem(record, primaryKey, secondaryKeys);
          return <View key={String(record.id ?? normalized.title)} style={[styles.row, { width: itemWidth }]}>
            <View style={styles.rowCard}>
              <ListCard title={normalized.title} subtitle={normalized.subtitle} status={record.status} onPress={() => setSelected(record)} />
            </View>
            <ActionMenu actions={[
              { label: `Ver ${singular}`, icon: 'eye-outline', onPress: () => setSelected(record) },
              { label: `Editar ${singular}`, icon: 'pencil-outline', onPress: () => setEditing(record) },
              ...(api.remove ? [{ label: `Remover ${singular}`, icon: 'delete-outline' as const, tone: 'danger' as const, onPress: () => setDeleting(record) }] : [])
            ]} />
          </View>;
        })}
      </View>}
      {!loading && !error && !filtered.length ? <Text style={styles.state}>Não há dados ainda</Text> : null}

      <AppModal visible={!!selected} onClose={() => setSelected(null)} title={selected ? normalizeItem(selected, primaryKey, secondaryKeys).title : singular}>
        {selected ? <>
          <View style={styles.sheetHeader}><Text style={styles.title}>{normalizeItem(selected, primaryKey, secondaryKeys).title}</Text>{selected.status ? <StatusBadge status={selected.status} /> : null}</View>
          {fields.map((field) => selected[field.key] ? <View key={field.key} style={styles.detailRow}><Text style={styles.detailLabel}>{field.label}</Text><Text style={styles.detailValue}>{String(selected[field.key])}</Text></View> : null)}
          <Button title={`Editar ${singular}`} tone="green" onPress={() => { setEditing(selected); setSelected(null); }} />
        </> : null}
      </AppModal>

      <AppModal
        visible={!!editing}
        onClose={() => setEditing(null)}
        position="center"
        title={editing?.id ? `Editar ${singular}` : `Novo ${singular}`}
        footer={<View style={styles.footer}>
          <View style={styles.footerItem}><Button title="Cancelar" tone="dark" onPress={() => setEditing(null)} /></View>
          <View style={styles.footerItem}><Button title={saving ? 'Salvando...' : 'Salvar'} tone="green" onPress={saving ? undefined : save} /></View>
        </View>}
      >
        {formError ? <Text style={styles.formError}>{formError}</Text> : null}
        {fields.map((field) => field.options ? <View key={field.key} style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>{field.label}</Text>
          <View style={styles.options}>
            {field.options.map((option) => (
              <TouchableOpacity key={option} style={[styles.option, editing?.[field.key] === option && styles.optionActive]} onPress={() => setEditing({ ...editing, [field.key]: option })}>
                <Text style={[styles.optionText, editing?.[field.key] === option && styles.optionTextActive]}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {fieldErrors[field.key] ? <Text style={styles.fieldError}>{fieldErrors[field.key]}</Text> : null}
        </View> : <View key={field.key}>
          <FormField
            label={field.label}
            placeholder={field.placeholder}
            multiline={field.multiline}
            keyboardType={field.keyboardType}
            value={String(editing?.[field.key] ?? '')}
            onChangeText={(text) => patchField(field.key, text)}
          />
          {fieldErrors[field.key] ? <Text style={styles.fieldError}>{fieldErrors[field.key]}</Text> : null}
        </View>)}
      </AppModal>

      <AppModal
        visible={!!deleting}
        onClose={() => setDeleting(null)}
        title="Confirmar remocao"
        footer={<View style={styles.footer}>
          <View style={styles.footerItem}><Button title="Cancelar" tone="dark" onPress={() => setDeleting(null)} /></View>
          <View style={styles.footerItem}><Button title="Remover" tone="red" onPress={confirmDelete} /></View>
        </View>}
      >
        <Text style={styles.detailValue}>Deseja remover este registro?</Text>
      </AppModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  plus: { backgroundColor: colors.red, width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowCard: { flex: 1 },
  state: { color: colors.muted, fontWeight: '800', marginTop: 8 },
  errorBox: { borderRadius: 14, borderWidth: 1, borderColor: '#5A2A2A', backgroundColor: '#241414', padding: 12, marginBottom: 12 },
  errorText: { color: colors.muted, lineHeight: 20 },
  retry: { color: colors.red, fontWeight: '900', marginTop: 8 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 },
  title: { color: '#fff', fontSize: 22, fontWeight: '900', flexShrink: 1 },
  detailRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  detailValue: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 4, lineHeight: 21 },
  footer: { flexDirection: 'row', gap: 10 },
  footerItem: { flex: 1 },
  formError: { color: colors.red, fontWeight: '800', marginBottom: 8 },
  fieldError: { color: colors.red, fontSize: 12, fontWeight: '700', marginTop: 5 },
  fieldBlock: { marginTop: 12 },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: '800', marginBottom: 7 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { minHeight: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  optionActive: { backgroundColor: colors.red, borderColor: colors.red },
  optionText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  optionTextActive: { color: '#fff' }
});
