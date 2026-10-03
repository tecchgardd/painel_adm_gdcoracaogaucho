import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import type { RegistroAcao, RegistroAtividade } from '@/features/registros/types';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export const ACAO_INFO: Record<RegistroAcao, { verbo: string; label: string; icon: IconName; tone: 'green' | 'blue' | 'red' | 'yellow' | 'neutral' }> = {
  CRIAR: { verbo: 'criou', label: 'Criação', icon: 'plus-circle-outline', tone: 'green' },
  ATUALIZAR: { verbo: 'alterou', label: 'Alteração', icon: 'pencil-outline', tone: 'blue' },
  EXCLUIR: { verbo: 'excluiu', label: 'Exclusão', icon: 'trash-can-outline', tone: 'red' },
  STATUS: { verbo: 'mudou o status de', label: 'Status', icon: 'swap-horizontal', tone: 'yellow' },
  LOGIN: { verbo: 'entrou no painel', label: 'Acesso', icon: 'login', tone: 'neutral' },
  LOGIN_FALHOU: { verbo: 'errou o login', label: 'Acesso negado', icon: 'shield-alert-outline', tone: 'red' },
  LOGOUT: { verbo: 'saiu do painel', label: 'Saída', icon: 'logout', tone: 'neutral' },
  SENHA: { verbo: 'redefiniu a senha de', label: 'Senha', icon: 'key-outline', tone: 'yellow' },
  PAGAMENTO: { verbo: 'registrou pagamento em', label: 'Pagamento', icon: 'cash-check', tone: 'green' },
  REEMBOLSO: { verbo: 'reembolsou', label: 'Reembolso', icon: 'cash-refund', tone: 'yellow' },
  VALIDACAO: { verbo: 'validou', label: 'Check-in', icon: 'qrcode-scan', tone: 'green' },
  EXPORTAR: { verbo: 'exportou', label: 'Exportação', icon: 'file-export-outline', tone: 'neutral' },
  OUTRO: { verbo: 'executou uma ação em', label: 'Outro', icon: 'dots-horizontal-circle-outline', tone: 'neutral' }
};

export const ENTIDADE_LABELS: Record<string, string> = {
  VENDA: 'venda',
  PAGAMENTO: 'pagamento',
  PEDIDO: 'pedido',
  INGRESSO: 'ingresso',
  LOTE: 'lote de ingressos',
  CORTESIA: 'cortesia',
  EVENTO: 'evento',
  BAILE: 'baile',
  CURSO: 'curso',
  INSCRICAO: 'inscrição',
  ALUNO: 'aluno',
  CLIENTE: 'cliente',
  EMPRESA: 'empresa',
  COLABORADOR: 'colaborador',
  FOTO: 'fotos',
  AGENTE_IA: 'agente IA',
  RELATORIO: 'relatório',
  AUTENTICACAO: 'acesso',
  SISTEMA: 'sistema'
};

/** Ações sem objeto ("entrou no painel") não citam a área. */
const SEM_OBJETO: RegistroAcao[] = ['LOGIN', 'LOGIN_FALHOU', 'LOGOUT'];

export function entidadeLabel(entidade: string) {
  return ENTIDADE_LABELS[entidade] ?? entidade.toLowerCase().replaceAll('_', ' ');
}

/** "Maria Fernandes alterou venda #VEN-12" */
export function registroFrase(registro: RegistroAtividade) {
  const autor = registro.autor?.nome ?? 'Sistema';
  const info = ACAO_INFO[registro.acao];
  if (SEM_OBJETO.includes(registro.acao)) return `${autor} ${info.verbo}`;
  const alvo = `${entidadeLabel(registro.entidade)}${registro.entidadeId ? ` #${registro.entidadeId}` : ''}`;
  return `${autor} ${info.verbo} ${alvo}`;
}

export function formatValorAlteracao(value: unknown) {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'object') return JSON.stringify(value);
  const text = String(value);
  // Enums da API (PENDENTE, CARTAO_CREDITO) viram texto legível.
  if (/^[A-Z][A-Z0-9_]+$/.test(text)) return (text.charAt(0) + text.slice(1).toLowerCase()).replaceAll('_', ' ');
  return text;
}

/** Rótulo do grupo por dia: "Hoje", "Ontem" ou a data. */
export function diaLabel(value: string, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((start(now) - start(date)) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (c) => c.toUpperCase());
}

export function agruparPorDia(registros: RegistroAtividade[], now = new Date()) {
  const groups: { dia: string; itens: RegistroAtividade[] }[] = [];
  registros.forEach((registro) => {
    const dia = diaLabel(registro.createdAt, now);
    const last = groups[groups.length - 1];
    if (last?.dia === dia) last.itens.push(registro);
    else groups.push({ dia, itens: [registro] });
  });
  return groups;
}

const CAMPO_LABELS: Record<string, string> = {
  formaPagamento: 'Forma de pagamento',
  valorTotal: 'Valor total',
  valorUnitario: 'Valor unitário',
  dataPagamento: 'Data do pagamento',
  paidAt: 'Pago em',
  fotoUrl: 'Foto',
  username: 'Usuário',
  cpf: 'CPF',
  role: 'Tipo de acesso',
  email: 'E-mail'
};

/** "formaPagamento" -> "Forma de pagamento"; campos sem mapa viram palavras a partir do camelCase. */
export function campoLabel(campo: string) {
  if (CAMPO_LABELS[campo]) return CAMPO_LABELS[campo];
  const words = campo.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
