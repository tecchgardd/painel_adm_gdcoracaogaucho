import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/core/api/client';

import { dashboardZeroState, getDashboardOverview, parseDashboardSummary } from './dashboard.service';

vi.mock('@/core/api/client', () => ({ api: { get: vi.fn() }, unwrapData: (value: any) => value?.data ?? value }));

describe('dashboard.service', () => {
  beforeEach(() => { vi.mocked(api.get).mockReset(); });

  it('converte o resumo em objeto para números, aceitando strings e campos ausentes', () => {
    const summary = parseDashboardSummary({ data: { receitaDia: '150.5', pagamentosPendentes: 3, proximoEvento: { nome: 'Baile', data: '2026-10-10', vendidos: '20', capacidade: 100 } } });
    expect(summary).toMatchObject({ receitaDia: 150.5, pagamentosPendentes: 3, pedidosPendentes: 0, ultimoCheckin: null });
    expect(summary?.proximoEvento).toEqual({ nome: 'Baile', data: '2026-10-10', local: undefined, cidade: undefined, vendidos: 20, capacidade: 100 });
  });

  it('retorna summary nulo no formato legado de seções', () => {
    expect(parseDashboardSummary({ data: [{ title: 'X', metrics: [] }] })).toBeNull();
    expect(parseDashboardSummary({ data: { sections: [] } })).toBeNull();
  });

  it('getDashboardOverview devolve resumo e seções do mesmo payload', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { bailesAtivos: 2 } } });
    const overview = await getDashboardOverview();
    expect(api.get).toHaveBeenCalledWith('/admin/dashboard');
    expect(overview.summary?.bailesAtivos).toBe(2);
    expect(overview.sections[0].metrics[0].value).toBe('2');
  });

  it('usa o estado zerado quando a lista de seções vem vazia', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
    const overview = await getDashboardOverview();
    expect(overview.summary).toBeNull();
    expect(overview.sections).toBe(dashboardZeroState);
  });
});
