import type { ApiField } from './ApiRecordScreen';

const defaultOptionLabels: Record<string, string> = { ATIVO: 'Ativo', INATIVO: 'Inativo' };

export function optionLabel(field: ApiField, value: string) {
  return field.optionLabels?.[value] ?? defaultOptionLabels[value] ?? value;
}

/** Agrupa os campos em seções (`section`) e linhas (pares de `half`). */
export function groupFields(fields: ApiField[]) {
  const sections: { title?: string; rows: ApiField[][] }[] = [];
  for (const field of fields) {
    if (!sections.length || field.section) sections.push({ title: field.section, rows: [] });
    const current = sections[sections.length - 1];
    const lastRow = current.rows[current.rows.length - 1];
    if (field.half && lastRow?.length === 1 && lastRow[0].half) lastRow.push(field);
    else current.rows.push([field]);
  }
  return sections;
}
