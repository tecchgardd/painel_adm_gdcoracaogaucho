import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
  banner?: string | null;
  imagemUrl?: string | null;
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
  adicionais?: { nome: string; cpf: string; telefone?: string; nomePar?: string }[];
  quantidadeParticipantes?: number;
  quantidadePadrinhosEsperada?: number;
  quantidadePadrinhosCadastrada?: number;
  padrinhosStatus?: 'PENDENTE' | 'COMPLETO' | string;
  padrinhos?: { nome?: string }[];
};

export type Pagamento = {
  id: string;
  customerId?: string;
  customer?: Customer;
  cliente?: Customer;
  pedido?: Record<string, unknown>;
  evento?: Evento;
  curso?: Evento;
  valor?: number;
  amount?: number;
  valorReembolsado?: number;
  refundedAmount?: number;
  moeda?: string;
  status?: EntityStatus | string;
  origem?: 'SITE' | 'WHATSAPP' | 'PAINEL_ADMIN' | string;
  metodo?: string;
  method?: string;
  createdAt?: string;
  checkoutCreatedAt?: string;
  expiresAt?: string;
  paidAt?: string;
  refundedAt?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeRefundId?: string;
  stripeDisputeId?: string;
  disputeStatus?: string;
  disputedAmount?: number;
  statusBeforeDispute?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  refundReason?: string;
};

export type SaleStatus = 'PENDENTE' | 'PROCESSANDO' | 'PAGO' | 'FALHOU' | 'CANCELADO' | 'EXPIRADO' | 'ESTORNADO' | 'PARCIALMENTE_ESTORNADO' | 'CONTESTADO' | 'CONTESTACAO_PERDIDA' | 'CORTESIA';
export type SaleType = 'EVENTO' | 'BAILE' | 'CURSO';
export type SaleItem = {
  id?: string | number;
  description?: string;
  nome?: string;
  quantity?: number;
  quantidade?: number;
  unitPrice?: number;
  valorUnitario?: number;
  total?: number;
  lote?: string;
};
export type Sale = {
  id: string;
  codigo: string;
  tipo: SaleType;
  status: SaleStatus;
  pessoaId?: string;
  pessoaTipo?: string;
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  eventoId?: string;
  cursoId?: string;
  inscricaoId?: string;
  eventoNome?: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  desconto: number;
  formaPagamento?: string;
  pagamentoId?: string;
  checkoutUrl?: string;
  observacao?: string;
  origem?: string;
  createdAt: string;
  updatedAt?: string;
  raw?: {
    id?: string | number;
    code?: string;
    status?: string;
    paymentStatus?: string;
    paymentMethod?: string;
    origin?: string;
    items?: SaleItem[];
  };
};

export type PaymentHistory = {
  id: string;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  reason?: string;
  createdAt: string;
  userName?: string;
};

export type DocumentFile = {
  id: string;
  type: 'TICKET' | 'ENROLLMENT' | 'PURCHASE_RECEIPT' | 'PAYMENT_RECEIPT';
  status: string;
  viewUrl?: string;
  downloadUrl?: string;
  qrCodeUrl?: string;
};

export type Ticket = DocumentFile & { code?: string; participantName?: string };
export type Enrollment = DocumentFile & { code?: string; participantName?: string };
export type PurchaseReceipt = DocumentFile & { saleId: string };

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
