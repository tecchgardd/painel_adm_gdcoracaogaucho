import { CrudRecord } from '@/shared/types';
import { ActionMenu, ListCard } from '@/shared/components/ui';

export function DataCard({ record, onEdit, onDelete }: { record: CrudRecord; onEdit: () => void; onDelete: () => void }) {
  return <ListCard
    title={record.titulo}
    subtitle={record.subtitulo ?? ''}
    status={record.status ? String(record.status) : undefined}
    onPress={onEdit}
    actions={<ActionMenu variant="ghost" actions={[
      { label: 'Editar', icon: 'pencil-outline', onPress: onEdit },
      { label: 'Excluir', icon: 'trash-can-outline', tone: 'danger', onPress: onDelete }
    ]} />}
  />;
}
