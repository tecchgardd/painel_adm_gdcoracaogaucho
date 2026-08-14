import type {
  AgentChannel,
  AgentChannelName,
  AgentConfig,
  AgentKnowledgeItem,
  AgentKnowledgeType,
  AgentLearningStatus,
  AgentLearningSuggestion,
  AgentPrompt,
  AgentPromptScope,
  AgentRecordStatus,
  AgentRule,
  AgentRuleCategory
} from '@/types/agent';

import { api, unwrapData } from './api';

const LIST_LIMIT = 100;

// ---- Configuração global ----
export async function getAgentConfig() {
  const response = await api.get('/admin/agent/config');
  return unwrapData<AgentConfig>(response.data);
}

export async function updateAgentConfig(payload: Partial<Pick<AgentConfig, 'aiEnabled' | 'firstResponseMode' | 'firstResponseDelaySeconds' | 'humanQueueSlaSeconds'>>) {
  const response = await api.patch('/admin/agent/config', payload);
  return unwrapData<AgentConfig>(response.data);
}

export async function setAgentStatus(enabled: boolean) {
  const response = await api.patch('/admin/agent/status', { enabled });
  return unwrapData<AgentConfig>(response.data);
}

// ---- Canais ----
export async function listAgentChannels() {
  const response = await api.get('/admin/agent/channels');
  return unwrapData<AgentChannel[]>(response.data);
}

export async function updateAgentChannel(channel: AgentChannelName, enabled: boolean) {
  const response = await api.patch(`/admin/agent/channels/${channel}`, { enabled });
  return unwrapData<AgentChannel>(response.data);
}

// ---- Regras ----
export type AgentRulePayload = Partial<{
  name: string;
  description: string;
  category: AgentRuleCategory;
  content: string;
  priority: number;
  status: AgentRecordStatus;
}>;

export async function listAgentRules(params: { status?: AgentRecordStatus } = {}) {
  const response = await api.get('/admin/agent/rules', { params: { limit: LIST_LIMIT, ...params } });
  return unwrapData<AgentRule[]>(response.data);
}

export async function getAgentRule(id: number | string) {
  const response = await api.get(`/admin/agent/rules/${id}`);
  return unwrapData<AgentRule>(response.data);
}

export async function createAgentRule(payload: AgentRulePayload) {
  const response = await api.post('/admin/agent/rules', payload);
  return unwrapData<AgentRule>(response.data);
}

export async function updateAgentRule(id: number | string, payload: AgentRulePayload) {
  const response = await api.patch(`/admin/agent/rules/${id}`, payload);
  return unwrapData<AgentRule>(response.data);
}

export async function updateAgentRuleStatus(id: number | string, status: AgentRecordStatus) {
  const response = await api.patch(`/admin/agent/rules/${id}/status`, { status });
  return unwrapData<AgentRule>(response.data);
}

export async function deleteAgentRule(id: number | string) {
  const response = await api.delete(`/admin/agent/rules/${id}`);
  return unwrapData(response.data);
}

// ---- Prompts ----
export type AgentPromptPayload = Partial<{
  name: string;
  description: string;
  content: string;
  tone: string;
  scope: AgentPromptScope;
  status: AgentRecordStatus;
}>;

export async function listAgentPrompts(params: { status?: AgentRecordStatus; scope?: AgentPromptScope } = {}) {
  const response = await api.get('/admin/agent/prompts', { params: { limit: LIST_LIMIT, ...params } });
  return unwrapData<AgentPrompt[]>(response.data);
}

export async function getAgentPrompt(id: number | string) {
  const response = await api.get(`/admin/agent/prompts/${id}`);
  return unwrapData<AgentPrompt>(response.data);
}

export async function createAgentPrompt(payload: AgentPromptPayload) {
  const response = await api.post('/admin/agent/prompts', payload);
  return unwrapData<AgentPrompt>(response.data);
}

export async function updateAgentPrompt(id: number | string, payload: AgentPromptPayload) {
  const response = await api.patch(`/admin/agent/prompts/${id}`, payload);
  return unwrapData<AgentPrompt>(response.data);
}

export async function updateAgentPromptStatus(id: number | string, status: AgentRecordStatus) {
  const response = await api.patch(`/admin/agent/prompts/${id}/status`, { status });
  return unwrapData<AgentPrompt>(response.data);
}

export async function deleteAgentPrompt(id: number | string) {
  const response = await api.delete(`/admin/agent/prompts/${id}`);
  return unwrapData(response.data);
}

// ---- Conhecimento ----
export type AgentKnowledgePayload = Partial<{
  title: string;
  content: string;
  type: AgentKnowledgeType;
  source: string;
  status: AgentRecordStatus;
}>;

export async function listAgentKnowledge(params: { status?: AgentRecordStatus; type?: AgentKnowledgeType } = {}) {
  const response = await api.get('/admin/agent/knowledge', { params: { limit: LIST_LIMIT, ...params } });
  return unwrapData<AgentKnowledgeItem[]>(response.data);
}

export async function getAgentKnowledge(id: number | string) {
  const response = await api.get(`/admin/agent/knowledge/${id}`);
  return unwrapData<AgentKnowledgeItem>(response.data);
}

export async function createAgentKnowledge(payload: AgentKnowledgePayload) {
  const response = await api.post('/admin/agent/knowledge', payload);
  return unwrapData<AgentKnowledgeItem>(response.data);
}

export async function updateAgentKnowledge(id: number | string, payload: AgentKnowledgePayload) {
  const response = await api.patch(`/admin/agent/knowledge/${id}`, payload);
  return unwrapData<AgentKnowledgeItem>(response.data);
}

export async function updateAgentKnowledgeStatus(id: number | string, status: AgentRecordStatus) {
  const response = await api.patch(`/admin/agent/knowledge/${id}/status`, { status });
  return unwrapData<AgentKnowledgeItem>(response.data);
}

export async function deleteAgentKnowledge(id: number | string) {
  const response = await api.delete(`/admin/agent/knowledge/${id}`);
  return unwrapData(response.data);
}

// ---- Aprendizados sugeridos (somente leitura + aprovar/rejeitar) ----
export async function listAgentLearningSuggestions(params: { status?: AgentLearningStatus } = {}) {
  const response = await api.get('/admin/agent/learning', { params: { limit: LIST_LIMIT, ...params } });
  return unwrapData<AgentLearningSuggestion[]>(response.data);
}

export async function getAgentLearningSuggestion(id: number | string) {
  const response = await api.get(`/admin/agent/learning/${id}`);
  return unwrapData<AgentLearningSuggestion>(response.data);
}

export async function approveAgentLearningSuggestion(id: number | string) {
  const response = await api.patch(`/admin/agent/learning/${id}/approve`);
  return unwrapData<AgentLearningSuggestion>(response.data);
}

export async function rejectAgentLearningSuggestion(id: number | string) {
  const response = await api.patch(`/admin/agent/learning/${id}/reject`);
  return unwrapData<AgentLearningSuggestion>(response.data);
}
