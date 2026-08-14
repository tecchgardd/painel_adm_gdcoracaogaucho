import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from './api';
import {
  approveAgentLearningSuggestion,
  createAgentRule,
  listAgentRules,
  setAgentStatus,
  updateAgentChannel,
  updateAgentPromptStatus,
  updateAgentRuleStatus
} from './agent.service';

vi.mock('./api', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }, unwrapData: (value: any) => value?.data ?? value }));

describe('contratos administrativos do Agente IA', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista regras com limit=100 e status opcional', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    await listAgentRules({ status: 'ATIVO' });
    expect(api.get).toHaveBeenCalledWith('/admin/agent/rules', { params: { limit: 100, status: 'ATIVO' } });
  });

  it('lista regras com limit=100 mesmo sem filtro', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    await listAgentRules();
    expect(api.get).toHaveBeenCalledWith('/admin/agent/rules', { params: { limit: 100 } });
  });

  it('cria regra com o payload informado', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    await createAgentRule({ name: 'Regra teste', content: 'Conteudo' });
    expect(api.post).toHaveBeenCalledWith('/admin/agent/rules', { name: 'Regra teste', content: 'Conteudo' });
  });

  it('usa o endpoint dedicado para alternar status da regra', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    await updateAgentRuleStatus(1, 'INATIVO');
    expect(api.patch).toHaveBeenCalledWith('/admin/agent/rules/1/status', { status: 'INATIVO' });
  });

  it('usa o endpoint dedicado para alternar status do prompt', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    await updateAgentPromptStatus(2, 'ATIVO');
    expect(api.patch).toHaveBeenCalledWith('/admin/agent/prompts/2/status', { status: 'ATIVO' });
  });

  it('usa o endpoint dedicado para o toggle global da IA', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    await setAgentStatus(false);
    expect(api.patch).toHaveBeenCalledWith('/admin/agent/status', { enabled: false });
  });

  it('alterna canal por nome', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    await updateAgentChannel('WHATSAPP', false);
    expect(api.patch).toHaveBeenCalledWith('/admin/agent/channels/WHATSAPP', { enabled: false });
  });

  it('aprova aprendizado sem corpo', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    await approveAgentLearningSuggestion(7);
    expect(api.patch).toHaveBeenCalledWith('/admin/agent/learning/7/approve');
  });
});
