import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { cancelarPagamento, listPagamentos, reembolsarPagamento } from './pagamentos.service';

vi.mock('./api', () => ({ api: { get: vi.fn(), patch: vi.fn(), post: vi.fn() }, unwrapData: (value: any) => value?.data ?? value }));

describe('contratos administrativos de pagamentos', () => {
  beforeEach(() => vi.clearAllMocks());
  it('envia paginação e filtros', async () => { vi.mocked(api.get).mockResolvedValue({ data: [] }); await listPagamentos({ page: 2, limit: 20, status: 'CONTESTADO', customerId: 'c1' }); expect(api.get).toHaveBeenCalledWith('/admin/pagamentos', { params: { page: 2, limit: 20, status: 'CONTESTADO', customerId: 'c1' } }); });
  it('envia motivo no cancelamento', async () => { vi.mocked(api.patch).mockResolvedValue({ data: {} }); await cancelarPagamento('p1', 'Solicitado'); expect(api.patch).toHaveBeenCalledWith('/admin/pagamentos/p1/cancelar', { reason: 'Solicitado' }); });
  it('envia reembolso total sem amount', async () => { vi.mocked(api.post).mockResolvedValue({ data: {} }); await reembolsarPagamento('p1', { reason: 'Cliente', stripeReason: 'requested_by_customer' }); expect(api.post).toHaveBeenCalledWith('/admin/pagamentos/p1/reembolsar', { reason: 'Cliente', stripeReason: 'requested_by_customer' }); });
  it('envia reembolso parcial em centavos', async () => { vi.mocked(api.post).mockResolvedValue({ data: {} }); await reembolsarPagamento('p1', { amount: 2500, reason: 'Acordo', stripeReason: 'requested_by_customer' }); expect(api.post).toHaveBeenCalledWith('/admin/pagamentos/p1/reembolsar', expect.objectContaining({ amount: 2500 })); });
});
