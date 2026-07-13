import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FloatingActionButton, Header, Screen, SearchBar } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { CrudField, CrudRecord } from '@/types';
import { DataCard } from './DataCard';
import { EmptyState } from './EmptyState';
import { FormModal } from './FormModal';
import { ConfirmModal } from './ConfirmModal';

export function CrudScreen({ title, storageKey, fields, initialData = [] }: { title: string; storageKey: string; fields: CrudField[]; initialData?: CrudRecord[] }) {
  const [records, setRecords] = useState<CrudRecord[]>([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Partial<CrudRecord> | null>(null);
  const [deleting, setDeleting] = useState<CrudRecord | null>(null);
  const { numColumns } = useResponsive();
  const itemWidth = numColumns === 1 ? '100%' : numColumns === 2 ? '48.5%' : '32%';

  useEffect(() => {
    setRecords([]);
  }, [initialData, storageKey]);

  function persist(next: CrudRecord[]) {
    setRecords(next);
  }

  function openNew() {
    setEditing({ id: String(Date.now()), status: 'ATIVO' });
  }

  function save() {
    if (!editing) return;
    const firstField = fields[0]?.key ?? 'titulo';
    const titleValue = String(editing[firstField] || editing.titulo || 'Novo registro');
    const subtitleValue = fields.slice(1, 3).map((field) => editing[field.key]).filter(Boolean).join(' - ');
    const record: CrudRecord = {
      ...editing,
      id: String(editing.id || Date.now()),
      titulo: titleValue,
      subtitulo: editing.subtitulo ? String(editing.subtitulo) : subtitleValue,
      status: editing.status ? String(editing.status) : 'ATIVO'
    };
    const exists = records.some((item) => item.id === record.id);
    persist(exists ? records.map((item) => item.id === record.id ? record : item) : [record, ...records]);
    setEditing(null);
  }

  function confirmDelete() {
    if (!deleting) return;
    persist(records.filter((item) => item.id !== deleting.id));
    setDeleting(null);
  }

  const filtered = useMemo(() => records.filter((record) =>
    `${record.titulo} ${record.subtitulo ?? ''} ${record.status ?? ''}`.toLowerCase().includes(query.toLowerCase())
  ), [records, query]);

  return <Screen variant="admin">
    <Header title={title} right={<FloatingActionButton onPress={openNew} />} />
    <SearchBar value={query} onChangeText={setQuery} placeholder={`Pesquisar ${title.toLowerCase()}`} />
    {filtered.length ? <View style={styles.grid}>
      {filtered.map((record) => <View key={record.id} style={{ width: itemWidth }}>
        <DataCard record={record} onEdit={() => setEditing(record)} onDelete={() => setDeleting(record)} />
      </View>)}
    </View> : <EmptyState />}
    <FormModal visible={!!editing} title={editing?.id && records.some((item) => item.id === editing.id) ? `Editar ${title}` : `Novo ${title}`} fields={fields} value={editing ?? {}} onChange={setEditing} onClose={() => setEditing(null)} onSubmit={save} />
    <ConfirmModal visible={!!deleting} title={deleting?.titulo ?? 'registro'} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />
  </Screen>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }
});
