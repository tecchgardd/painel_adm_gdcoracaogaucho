import type { UserRole } from '@/shared/types/entities';

/** Ações comuns a vários módulos; colunas da matriz de permissões. */
export type AcaoPadrao = 'ver' | 'criar' | 'editar' | 'excluir';

export type AcaoEspecial = { chave: string; nome: string; descricao?: string };

export type ModuloPermissao = {
  chave: string;
  nome: string;
  grupo: string;
  descricao: string;
  /** Rotas do painel que exigem `<chave>.ver`. */
  rotas: string[];
  acoes: AcaoPadrao[];
  /** Nome da ação neste módulo quando o rótulo genérico não diz o suficiente (ex.: "Emitir" em Cortesias). */
  rotulos?: Partial<Record<AcaoPadrao, string>>;
  especiais?: AcaoEspecial[];
};

export const ACOES_PADRAO: { chave: AcaoPadrao; nome: string }[] = [
  { chave: 'ver', nome: 'Ver' },
  { chave: 'criar', nome: 'Criar' },
  { chave: 'editar', nome: 'Editar' },
  { chave: 'excluir', nome: 'Excluir' }
];

/**
 * Catálogo de permissões do painel. A chave de cada permissão é `<modulo>.<acao>` (ex.: `vendas.criar`)
 * e é a mesma que o backend confere nas rotas — contrato em `docs/backend/2026-10-03-perfis-acesso.md`.
 */
export const MODULOS: ModuloPermissao[] = [
  { chave: 'dashboard', nome: 'Dashboard', grupo: 'Principal', descricao: 'Indicadores e pendências do dia.', rotas: ['/dashboard'], acoes: ['ver'] },
  { chave: 'eventos', nome: 'Eventos, bailes e cursos', grupo: 'Principal', descricao: 'Agenda, lotes, turmas e capacidade.', rotas: ['/eventos', '/bailes', '/cursos'], acoes: ['ver', 'criar', 'editar'] },
  { chave: 'checkin', nome: 'Check-in', grupo: 'Principal', descricao: 'Validar ingressos na entrada e ver o histórico de validações.', rotas: ['/scanner', '/historico-validacoes'], acoes: ['ver'], rotulos: { ver: 'Usar' } },
  {
    chave: 'vendas', nome: 'Vendas', grupo: 'Comercial', descricao: 'Vendas de ingressos e inscrições.', rotas: ['/vendas', '/pedidos'], acoes: ['ver', 'criar'], rotulos: { criar: 'Vender' },
    especiais: [{ chave: 'pagamento', nome: 'Gerenciar pagamento', descricao: 'Gerar link Stripe, alterar ou substituir o pagamento da venda.' }]
  },
  {
    chave: 'ingressos', nome: 'Ingressos', grupo: 'Comercial', descricao: 'Ingressos emitidos, portadores e códigos.', rotas: ['/ingressos'], acoes: ['ver', 'editar'], rotulos: { editar: 'Trocar portador' },
    especiais: [{ chave: 'cancelar', nome: 'Cancelar ingresso', descricao: 'O ingresso deixa de valer na portaria.' }]
  },
  {
    chave: 'inscricoes', nome: 'Inscrições', grupo: 'Comercial', descricao: 'Alunos inscritos nos cursos, pares e padrinhos.', rotas: ['/alunos'], acoes: ['ver', 'criar', 'editar'],
    especiais: [{ chave: 'exportar', nome: 'Exportar', descricao: 'Baixar a lista em CSV ou PDF (inclui CPF completo).' }]
  },
  {
    chave: 'pagamentos', nome: 'Pagamentos', grupo: 'Comercial', descricao: 'Cobranças, baixas manuais e cancelamentos.', rotas: ['/pagamentos'], acoes: ['ver', 'editar'], rotulos: { editar: 'Editar / dar baixa' },
    especiais: [{ chave: 'reembolsar', nome: 'Reembolsar', descricao: 'Solicitar reembolso na Stripe.' }]
  },
  {
    chave: 'cortesias', nome: 'Cortesias', grupo: 'Comercial', descricao: 'Ingressos gratuitos com motivo.', rotas: ['/cortesias'], acoes: ['ver', 'criar'], rotulos: { criar: 'Emitir' },
    especiais: [
      { chave: 'cancelar', nome: 'Cancelar cortesia' },
      { chave: 'exportar', nome: 'Exportar', descricao: 'Baixar a lista em CSV ou PDF.' }
    ]
  },
  { chave: 'pessoas', nome: 'Pessoas', grupo: 'Cadastros', descricao: 'Clientes e alunos, com histórico.', rotas: ['/clientes'], acoes: ['ver', 'criar', 'editar', 'excluir'], rotulos: { editar: 'Editar / inativar' } },
  { chave: 'empresas', nome: 'Empresas', grupo: 'Cadastros', descricao: 'Patrocinadores e parceiros do site.', rotas: ['/empresas'], acoes: ['ver', 'criar', 'editar', 'excluir'] },
  { chave: 'colaboradores', nome: 'Colaboradores', grupo: 'Cadastros', descricao: 'Equipe com acesso ao painel, senhas e perfil de cada um.', rotas: ['/colaboradores'], acoes: ['ver', 'criar', 'editar', 'excluir'] },
  { chave: 'perfis', nome: 'Perfis de acesso', grupo: 'Administração', descricao: 'Criar perfis e definir o que cada um pode fazer.', rotas: ['/perfis'], acoes: ['ver', 'criar', 'editar', 'excluir'] },
  {
    chave: 'relatorios', nome: 'Relatórios', grupo: 'Administração', descricao: 'Indicadores completos.', rotas: ['/relatorios'], acoes: ['ver'],
    especiais: [{ chave: 'exportar', nome: 'Exportar' }]
  },
  { chave: 'registros', nome: 'Registro de atividades', grupo: 'Administração', descricao: 'Quem fez o quê e quando.', rotas: ['/registros'], acoes: ['ver'] },
  { chave: 'fotos', nome: 'Fotos', grupo: 'Administração', descricao: 'Galeria e envio de fotos de formaturas.', rotas: ['/fotos'], acoes: ['ver', 'criar'], rotulos: { criar: 'Enviar' } },
  { chave: 'agente-ia', nome: 'Agente IA', grupo: 'Administração', descricao: 'Regras, prompts e base de conhecimento da IA.', rotas: ['/agente-ia'], acoes: ['ver', 'criar', 'editar', 'excluir'] }
];

/** Telas que qualquer usuário logado abre (perfil próprio, ajuda, menus que já se filtram sozinhos). */
export const ROTAS_LIVRES = ['/menu', '/perfil', '/ajuda', '/sobre', '/configuracoes', '/gestao', '/cadastros'];

/** Permissão que dá acesso total; reservada ao perfil Administrador. */
export const PERMISSAO_TOTAL = '*';

export function chavesDoModulo(modulo: ModuloPermissao) {
  return [...modulo.acoes.map((acao) => `${modulo.chave}.${acao}`), ...(modulo.especiais ?? []).map((especial) => `${modulo.chave}.${especial.chave}`)];
}

export const TODAS_PERMISSOES = MODULOS.flatMap(chavesDoModulo);

const SEM_ATENDIMENTO = new Set([
  ...chavesDoModulo(MODULOS.find((modulo) => modulo.chave === 'colaboradores')!),
  ...chavesDoModulo(MODULOS.find((modulo) => modulo.chave === 'perfis')!),
  ...chavesDoModulo(MODULOS.find((modulo) => modulo.chave === 'relatorios')!),
  'registros.ver',
  'pagamentos.reembolsar',
  'cortesias.criar',
  'cortesias.cancelar',
  'ingressos.cancelar',
  'agente-ia.excluir'
]);

export type PerfilPadrao = { id: string; nome: string; descricao: string; role: UserRole; sistema: boolean; permissoes: string[] };

/**
 * Perfis que existem desde o início, equivalentes aos três tipos de acesso antigos. Usados quando o
 * backend ainda não manda perfis/permissões na sessão (o acesso continua vindo do `role`).
 */
export const PERFIS_PADRAO: PerfilPadrao[] = [
  { id: 'administrador', nome: 'Administrador', descricao: 'Acesso total ao painel. Não pode ser editado nem excluído.', role: 'ADMIN', sistema: true, permissoes: [PERMISSAO_TOTAL] },
  { id: 'atendimento', nome: 'Atendimento', descricao: 'Operação do dia a dia: vendas, inscrições, pagamentos e cadastros.', role: 'STAFF', sistema: false, permissoes: TODAS_PERMISSOES.filter((chave) => !SEM_ATENDIMENTO.has(chave)) },
  { id: 'portaria', nome: 'Portaria', descricao: 'Somente o check-in na entrada dos eventos.', role: 'CHECKIN', sistema: false, permissoes: ['checkin.ver'] }
];

export function perfilPadraoDoRole(role?: UserRole | null) {
  return PERFIS_PADRAO.find((perfil) => perfil.role === role);
}
