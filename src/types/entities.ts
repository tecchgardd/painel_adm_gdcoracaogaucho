import { MaterialCommunityIcons } from '@expo/vector-icons';
import type React from 'react';

export type MetricVariant = 'success' | 'danger' | 'warning' | 'neutral';
export type DashboardMetric = {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  variant: MetricVariant;
  trend?: string;
};

export type ReportCategory = {
  title: string;
  metrics: DashboardMetric[];
  chart?: {
    label: string;
    value: number;
    variant: DashboardMetric['variant'];
  }[];
};

export type UserRole = 'ADMIN' | 'STAFF' | 'CHECKIN';

export type SessionUser = {
  id?: string;
  nome?: string;
  name?: string;
  email?: string;
  role?: UserRole;
  tipoAcesso?: UserRole;
  accessType?: UserRole;
};

export type AuthSession = {
  user?: SessionUser;
  token?: string;
  session?: unknown;
};

export type EntityStatus = 'ATIVO' | 'FUTURO' | 'ENCERRADO' | 'PENDENTE' | 'PAGO' | 'ENTREGUE' | 'CANCELADO' | 'CONFIRMADO' | 'CORTESIA';

export type EventType = 'BAILE' | 'CURSO' | 'EVENTO';

export type Customer = {
  id: string;
  nome?: string;
  name?: string;
  email?: string;
  telefone?: string;
  phone?: string;
  cpf?: string;
  cep?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  complemento?: string;
  endereco?: string;
  historicoPedidos?: unknown[];
  status?: EntityStatus | string;
};

export type Evento = {
  id: string;
  tipo?: EventType;
  nome?: string;
  name?: string;
  data?: string;
  date?: string;
  local?: string;
  location?: string;
  cidade?: string;
  descricao?: string;
  observacao?: string;
  banner?: string;
  imagemUrl?: string;
  atracao?: string;
  professor?: string;
  preco?: number;
  status?: EntityStatus | string;
  capacidade?: number;
  capacity?: number;
  vendidos?: number;
  sold?: number;
  receita?: number;
  revenue?: number;
};

export type Ingresso = {
  id: string;
  codigo?: string;
  code?: string;
  status?: EntityStatus | string;
  eventoId?: string;
  eventId?: string;
  customerId?: string;
};

export type Inscricao = {
  id: string;
  customerId?: string;
  cursoId?: string;
  courseId?: string;
  status?: EntityStatus | string;
  nome?: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  cep?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  complemento?: string;
  jaFoiAluno?: boolean;
  cursoCidadeAnterior?: string;
  nomePar?: string;
  semPar?: boolean;
  inscricaoMultipla?: boolean;
  quantidadeAdicionais?: number;
  adicionais?: Array<{ nome: string; cpf: string; telefone?: string; nomePar?: string }>;
  quantidadeParticipantes?: number;
  quantidadePadrinhosEsperada?: number;
  quantidadePadrinhosCadastrada?: number;
  padrinhosStatus?: 'PENDENTE' | 'COMPLETO' | string;
  padrinhos?: Array<{ nome?: string }>;
};

export type Pagamento = {
  id: string;
  customerId?: string;
  valor?: number;
  amount?: number;
  status?: EntityStatus | string;
  metodo?: string;
  method?: string;
};

export type Cortesia = {
  id: string;
  beneficiario?: string;
  customerId?: string;
  eventoId?: string;
  eventId?: string;
  codigo?: string;
  code?: string;
  status?: EntityStatus | string;
};

export type Colaborador = {
  id: string;
  nome?: string;
  name?: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  phone?: string;
  cep?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  complemento?: string;
  endereco?: string;
  cargo?: string;
  role?: UserRole | string;
  tipoAcesso?: UserRole | string;
  status?: EntityStatus | string;
  userId?: string;
  user?: {
    id: string;
    email?: string;
    role?: UserRole | string;
    mustChangePassword?: boolean;
  };
};

export type DashboardSectionData = {
  title: string;
  metrics: DashboardMetric[];
};

export type DashboardMetrics = DashboardSectionData[];

export type ReportMetrics = ReportCategory[];

export type ScannerStatus = 'VALIDO' | 'JA_UTILIZADO' | 'CANCELADO' | 'NAO_ENCONTRADO' | 'EVENTO_EXPIRADO';

export type ScannerResult = {
  status: ScannerStatus;
  ingresso?: Ingresso;
  message?: string;
};
