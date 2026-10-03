/** Ações registradas pelo backend (ver docs/backend/registro-de-atividades.md). */
export type RegistroAcao =
  | 'CRIAR'
  | 'ATUALIZAR'
  | 'EXCLUIR'
  | 'STATUS'
  | 'LOGIN'
  | 'LOGIN_FALHOU'
  | 'LOGOUT'
  | 'SENHA'
  | 'PAGAMENTO'
  | 'REEMBOLSO'
  | 'VALIDACAO'
  | 'EXPORTAR'
  | 'OUTRO';

export type RegistroAlteracao = { campo: string; antes?: unknown; depois?: unknown };

export type RegistroAutor = {
  id?: string;
  nome: string;
  email?: string;
  username?: string;
  role?: string;
  fotoUrl?: string | null;
};

export type RegistroAtividade = {
  id: string;
  createdAt: string;
  /** null = ação do sistema (webhook, rotina automática). */
  autor: RegistroAutor | null;
  acao: RegistroAcao;
  /** Área afetada: VENDA, PAGAMENTO, EVENTO, COLABORADOR... */
  entidade: string;
  entidadeId?: string;
  descricao?: string;
  alteracoes: RegistroAlteracao[];
  ip?: string;
  userAgent?: string;
};

export type RegistroFiltros = {
  page?: number;
  limit?: number;
  search?: string;
  acao?: RegistroAcao | RegistroAcao[];
  entidade?: string;
  usuarioId?: string;
  dataInicial?: string;
  dataFinal?: string;
};

export type RegistroPagina = {
  data: RegistroAtividade[];
  total: number;
  page: number;
  limit: number;
  /** A API ainda não expõe /admin/registros (404). */
  indisponivel?: boolean;
};
