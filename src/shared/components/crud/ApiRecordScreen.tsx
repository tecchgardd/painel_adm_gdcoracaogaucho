import { useCallback, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { z } from 'zod';

import { ActionMenu, AppModal, Button, ChoiceGroup, FloatingActionButton, FormField, FormRow, FormSection, Header, InfoList, InfoRow, ListCard, Screen, StatusBadge, FilterBar } from '@/shared/components/ui';
import { matchSituacao } from '@/shared/utils/situacao';
import { gridCellStyle, gridContainer } from '@/shared/components/ui/grid';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ErrorState } from '@/shared/components/feedback/ErrorState';
import { LoadingState } from '@/shared/components/feedback/LoadingState';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { buscarEnderecoPorCep } from '@/shared/services/cep.service';
import { colors, theme } from '@/theme/theme';

import { groupFields, optionLabel } from './fieldLayout';

export type ApiField = {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad' | 'decimal-pad';
  options?: string[];
  /** Rótulo exibido para cada valor de `options` (o valor enviado à API não muda). */
  optionLabels?: Record<string, string>;
  readOnly?: boolean;
  required?: boolean;
  /** Abre um novo bloco titulado no formulário a partir deste campo. */
  section?: string;
  /** Dois campos `half` consecutivos ficam lado a lado (empilham no mobile). */
  half?: boolean;
};

export type ExtraAction = {
  label: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  tone?: 'default' | 'danger';
  onPress: () => Promise<void> | void;
};

type CrudApi = {
  list: () => Promise<any[]>;
  /** Sem `create`/`update` (perfil sem permissão), o botão + e o "Editar" não aparecem. */
  create?: (data: any) => Promise<any>;
  update?: (id: string, data: any) => Promise<any>;
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
  normalizeRecord = (record) => record,
  extraActions,
  embedded = false
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
  extraActions?: (record: any) => ExtraAction[];
  embedded?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [situacao, setSituacao] = useState('TODOS');
  const statusField = fields.find((field) => field.key === 'status');
  const [editing, setEditing] = useState<any | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState('');
  const { numColumns } = useResponsive();
  const gridCell = gridCellStyle(numColumns);
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
      if (editing.id) await api.update?.(String(editing.id), payload);
      else await api.create?.(payload);
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

  async function runExtraAction(action: ExtraAction) {
    setActionError('');
    try {
      await action.onPress();
      refetch();
    } catch (extraActionError) {
      setActionError((extraActionError as { message?: string })?.message ?? 'Não foi possível concluir a ação.');
    }
  }

  const body = (
    <>
      <Header title={title} right={api.create ? <FloatingActionButton onPress={openNew} accessibilityLabel={`Novo ${singular}`} /> : undefined} />
      <FilterBar
        search={{ value: query, onChange: setQuery, placeholder: `Buscar ${title.toLowerCase()}` }}
        filters={statusField?.options ? [{
          key: 'status',
          label: statusField.label,
          value: situacao,
          allValue: 'TODOS',
          options: [{ value: 'TODOS', label: 'Todos' }, ...statusField.options.map((option) => ({ value: option, label: optionLabel(statusField, option) }))],
          onChange: setSituacao
        }] : []}
      />
      {actionError ? <Text style={styles.formError}>{actionError}</Text> : null}
      {loading ? <LoadingState label={`Carregando ${title.toLowerCase()}...`} /> : null}
      {error ? <ErrorState message={error} onRetry={refetch} /> : null}
      {!error && <View style={styles.grid}>
        {filtered.filter((record) => matchSituacao(record.status, situacao)).map((record) => {
          const normalized = normalizeItem(record, primaryKey, secondaryKeys);
          return <View key={String(record.id ?? normalized.title)} style={gridCell}>
            <ListCard title={normalized.title} subtitle={normalized.subtitle} status={record.status} onPress={() => setSelected(record)}
            actions={<ActionMenu variant="ghost" actions={[
              { label: `Ver ${singular}`, icon: 'eye-outline', onPress: () => setSelected(record) },
              ...(api.update ? [{ label: `Editar ${singular}`, icon: 'pencil-outline' as const, onPress: () => setEditing(record) }] : []),
              ...(extraActions && api.update ? extraActions(record).map((action) => ({ ...action, onPress: () => runExtraAction(action) })) : []),
              ...(api.remove ? [{ label: `Remover ${singular}`, icon: 'delete-outline' as const, tone: 'danger' as const, onPress: () => setDeleting(record) }] : [])
            ]} />}
          />
          </View>;
        })}
      </View>}
      {!loading && !error && !filtered.filter((record) => matchSituacao(record.status, situacao)).length ? <EmptyState title={`Nenhum ${singular.toLowerCase()} encontrado.`} /> : null}

      <AppModal visible={!!selected} onClose={() => setSelected(null)} title={selected ? normalizeItem(selected, primaryKey, secondaryKeys).title : singular}>
        {selected ? <>
          {selected.status ? <View style={styles.sheetHeader}><StatusBadge status={selected.status} /></View> : null}
          <InfoList>
            {fields.filter((field) => field.key !== 'status' && selected[field.key] !== undefined && selected[field.key] !== null && selected[field.key] !== '').map((field) => (
              <InfoRow key={field.key} label={field.label} value={field.options ? optionLabel(field, String(selected[field.key])) : String(selected[field.key])} />
            ))}
          </InfoList>
          {api.update ? <View style={styles.detailAction}><Button title={`Editar ${singular}`} tone="green" onPress={() => { setEditing(selected); setSelected(null); }} /></View> : null}
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
        {groupFields(fields.filter((field) => !field.readOnly)).map((section, sectionIndex) => {
          const rows = section.rows.map((row) => row.length > 1
            ? <FormRow key={row[0].key}>{row.map(renderField)}</FormRow>
            : <View key={row[0].key}>{renderField(row[0])}</View>);
          return section.title
            ? <FormSection key={section.title} first={sectionIndex === 0} title={section.title}>{rows}</FormSection>
            : <View key={`section-${sectionIndex}`}>{rows}</View>;
        })}
      </AppModal>

      <AppModal
        visible={!!deleting}
        onClose={() => setDeleting(null)}
        title="Confirmar remoção"
        size="sm"
        footer={<View style={styles.footer}>
          <View style={styles.footerItem}><Button title="Cancelar" tone="dark" onPress={() => setDeleting(null)} /></View>
          <View style={styles.footerItem}><Button title="Remover" tone="red" onPress={confirmDelete} /></View>
        </View>}
      >
        <Text style={styles.detailValue}>Deseja remover este registro?</Text>
      </AppModal>
    </>
  );

  return embedded ? body : <Screen variant="admin">{body}</Screen>;

  function renderField(field: ApiField) {
    if (field.options) {
      return <View key={field.key} style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{field.label}{field.required ? <Text style={styles.required}> *</Text> : null}</Text>
        <ChoiceGroup
          options={field.options.map((option) => ({ value: option, label: optionLabel(field, option) }))}
          value={String(editing?.[field.key] ?? '')}
          onChange={(value) => setEditing({ ...editing, [field.key]: value })}
        />
        {fieldErrors[field.key] ? <Text style={styles.fieldError}>{fieldErrors[field.key]}</Text> : null}
      </View>;
    }
    return <FormField
      key={field.key}
      label={field.label}
      required={field.required}
      placeholder={field.placeholder}
      multiline={field.multiline}
      keyboardType={field.keyboardType}
      autoCapitalize={field.keyboardType === 'email-address' ? 'none' : undefined}
      value={String(editing?.[field.key] ?? '')}
      onChangeText={(text) => patchField(field.key, text)}
      error={fieldErrors[field.key]}
    />;
  }
}

const styles = StyleSheet.create({
  grid: gridContainer,
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  detailAction: { marginTop: 16 },
  detailValue: { color: colors.text, fontSize: 15, fontFamily: theme.font.semiBold, marginTop: 4, lineHeight: 21 },
  footer: { flexDirection: 'row', gap: 10 },
  footerItem: { flex: 1 },
  formError: { color: colors.red, fontFamily: theme.font.semiBold, marginBottom: 8 },
  fieldError: { color: colors.red, fontSize: 12, fontFamily: theme.font.medium, marginTop: 5 },
  fieldBlock: { marginTop: 14 },
  fieldLabel: { color: colors.muted, fontSize: 12, fontFamily: theme.font.medium, marginBottom: 8 },
  required: { color: colors.red }
});
