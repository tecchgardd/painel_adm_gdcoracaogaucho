import type { Cortesia } from '@/shared/types/entities';
import { cpfFormatado, dataHora, rotuloStatus, type ExportColumn } from '@/shared/utils/exportacao';

import { responsavelNome } from './cortesiaForm';

type Row = Cortesia & Record<string, any>;

/** Colunas disponíveis para exportar cortesias; `padrao` são as marcadas ao abrir o modal. */
export const CORTESIA_COLUMNS: ExportColumn<Row>[] = [
  { key: 'nome', label: 'Beneficiário', value: (row) => row.nome ?? row.beneficiario ?? row.customer?.nome, padrao: true, peso: 1.6 },
  { key: 'cpf', label: 'CPF', value: (row) => cpfFormatado(row.cpf ?? row.customer?.cpf), padrao: true, peso: 1.1 },
  { key: 'telefone', label: 'Telefone', value: (row) => row.telefone ?? row.customer?.telefone, peso: 1.1 },
  { key: 'evento', label: 'Evento/baile', value: (row) => row.evento?.nome, padrao: true, peso: 1.5 },
  { key: 'dataEvento', label: 'Data do evento', value: (row) => dataHora(row.evento?.dataInicio ?? row.evento?.data), peso: 1.1 },
  { key: 'quantidade', label: 'Ingressos', value: (row) => row.quantidade ?? 1, padrao: true, peso: 0.7 },
  { key: 'motivo', label: 'Motivo', value: (row) => row.motivo, padrao: true, peso: 2.2 },
  { key: 'responsavel', label: 'Emitida por', value: (row) => responsavelNome(row.responsavel), padrao: true, peso: 1.2 },
  { key: 'status', label: 'Situação', value: (row) => rotuloStatus(row.status ?? 'ATIVO'), padrao: true, peso: 0.9 },
  { key: 'criado', label: 'Emitida em', value: (row) => dataHora(row.createdAt), padrao: true, peso: 1.1 },
  { key: 'modificado', label: 'Última modificação', value: (row) => dataHora(row.updatedAt), peso: 1.1 },
  { key: 'codigo', label: 'Código', value: (row) => row.codigo ?? row.code ?? row.ingresso?.codigo ?? (Array.isArray(row.ingressos) ? row.ingressos.map((ingresso: any) => ingresso?.codigo).filter(Boolean).join(', ') : undefined), peso: 1 },
  { key: 'id', label: 'Nº cortesia', value: (row) => row.id, peso: 0.8 }
];
