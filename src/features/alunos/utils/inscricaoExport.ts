import type { Inscricao } from '@/shared/types/entities';
import { cpfFormatado, dataHora, rotuloStatus, type ExportColumn } from '@/shared/utils/exportacao';

type Row = Inscricao & Record<string, any>;

const simNao = (value: unknown) => (value === undefined || value === null ? '' : value ? 'Sim' : 'Não');

export function enderecoCompleto(row: Row) {
  const rua = [row.rua, row.numero].filter(Boolean).join(', ');
  return [rua, row.complemento, row.bairro, row.cep].filter(Boolean).join(' - ');
}

export function nomesPadrinhos(row: Row) {
  return (row.padrinhos ?? []).map((padrinho) => padrinho?.nome?.trim()).filter(Boolean).join(', ');
}

export function nomesAdicionais(row: Row) {
  return (row.adicionais ?? []).map((adicional) => [adicional.nome, adicional.nomePar ? `par: ${adicional.nomePar}` : ''].filter(Boolean).join(' ')).filter(Boolean).join('; ');
}

/** Colunas disponíveis para exportar inscrições; `padrao` são as marcadas ao abrir o modal. */
export const INSCRICAO_COLUMNS: ExportColumn<Row>[] = [
  { key: 'nome', label: 'Aluno', value: (row) => row.nome, padrao: true, peso: 1.6 },
  { key: 'cpf', label: 'CPF', value: (row) => cpfFormatado(row.cpf), padrao: true, peso: 1.1 },
  { key: 'telefone', label: 'Telefone', value: (row) => row.telefone, padrao: true, peso: 1.1 },
  { key: 'email', label: 'E-mail', value: (row) => row.email, peso: 1.6 },
  { key: 'endereco', label: 'Endereço', value: enderecoCompleto, peso: 2 },
  { key: 'cidade', label: 'Cidade/UF', value: (row) => [row.cidade, row.estado].filter(Boolean).join('/'), padrao: true },
  { key: 'curso', label: 'Curso/turma', value: (row) => row.courseId, padrao: true, peso: 1.4 },
  { key: 'status', label: 'Status', value: (row) => rotuloStatus(row.status), padrao: true, peso: 0.9 },
  { key: 'par', label: 'Par', value: (row) => (row.semPar ? 'Sem par' : row.nomePar ?? row.par), padrao: true, peso: 1.3 },
  { key: 'jaFoiAluno', label: 'Já foi aluno', value: (row) => simNao(row.jaFoiAluno), peso: 0.7 },
  { key: 'cursoAnterior', label: 'Curso anterior', value: (row) => row.cursoCidadeAnterior, peso: 1.3 },
  { key: 'participantes', label: 'Participantes', value: (row) => row.quantidadeParticipantes, peso: 0.8 },
  { key: 'adicionais', label: 'Pessoas adicionais', value: nomesAdicionais, peso: 1.8 },
  { key: 'padrinhos', label: 'Padrinhos', value: nomesPadrinhos, padrao: true, peso: 2 },
  { key: 'padrinhosStatus', label: 'Situação padrinhos', value: (row) => `${rotuloStatus(row.padrinhosStatus)}${row.quantidadePadrinhosEsperada ? ` (${(row.padrinhos ?? []).filter((padrinho) => padrinho?.nome?.trim()).length}/${row.quantidadePadrinhosEsperada})` : ''}`, peso: 1 },
  { key: 'criado', label: 'Data da inscrição', value: (row) => dataHora(row.createdAt), padrao: true, peso: 1.1 },
  { key: 'modificado', label: 'Última modificação', value: (row) => dataHora(row.updatedAt), peso: 1.1 },
  { key: 'id', label: 'Nº inscrição', value: (row) => row.id, peso: 0.8 }
];
