export type AgentRecordStatus = 'ATIVO' | 'INATIVO';
export type AgentFirstResponseMode = 'INSTANT' | 'DELAYED';
export type AgentChannelName = 'WHATSAPP' | 'EMAIL' | 'INSTAGRAM' | 'FACEBOOK' | 'WEBSITE';
export type AgentRuleCategory = 'GERAL' | 'VENDAS' | 'INSCRICAO' | 'ATENDIMENTO' | 'PAGAMENTO';
export type AgentPromptScope = 'GENERAL' | 'VENDAS' | 'INSCRICAO';
export type AgentKnowledgeType = 'FAQ' | 'POLICY' | 'EVENT' | 'COURSE' | 'PAYMENT' | 'TICKET' | 'OTHER';
export type AgentLearningStatus = 'PENDENTE' | 'APROVADO' | 'REJEITADO';

export type AgentConfig = {
  id: number;
  aiEnabled: boolean;
  firstResponseMode: AgentFirstResponseMode;
  firstResponseDelaySeconds: number;
  humanQueueSlaSeconds: number;
  updatedById: number | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentChannel = {
  id: number;
  channel: AgentChannelName;
  enabled: boolean;
  provider: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentRule = {
  id: number;
  name: string;
  description?: string | null;
  category: AgentRuleCategory;
  content: string;
  priority: number;
  status: AgentRecordStatus;
  createdBy?: number | null;
  updatedBy?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentPrompt = {
  id: number;
  name: string;
  description?: string | null;
  content: string;
  tone?: string | null;
  scope?: AgentPromptScope | null;
  status: AgentRecordStatus;
  version: number;
  createdById?: number | null;
  updatedById?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentKnowledgeItem = {
  id: number;
  title: string;
  content: string;
  type: AgentKnowledgeType;
  source?: string | null;
  status: AgentRecordStatus;
  approvedById?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentLearningSuggestion = {
  id: number;
  title: string;
  description: string;
  source?: string | null;
  occurrences: number;
  suggestedType: string;
  status: AgentLearningStatus;
  reviewedById?: number | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};
