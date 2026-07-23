import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { listSales } from './sales.service';

vi.mock('./api', () => ({
  api: { get: vi.fn() },
  unwrapData: <T>(value: T) => value
}));

describe('contrato administrativo de vendas', () => {
  beforeEach(() => vi.clearAllMocks());

  it('preserva o envelope paginado retornado diretamente pela API', async () => {
    const page = {
      data: [{ id: '1', codigo: 'VEN-1' }],
      total: 1,
      page: 1,
      limit: 20,
      summary: { totalVendido: 100, vendasPagas: 1, vendasPendentes: 0, cortesias: 0 }
    };
    vi.mocked(api.get).mockResolvedValue({ data: page });

    await expect(listSales({ page: 1, limit: 20 })).resolves.toEqual(page);
  });

  it('aceita o envelope data externo sem perder a paginação', async () => {
    const page = { data: [], total: 0, page: 1, limit: 20 };
    vi.mocked(api.get).mockResolvedValue({ data: { data: page } });

    await expect(listSales()).resolves.toEqual(page);
  });
});
