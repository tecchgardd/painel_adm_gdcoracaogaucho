import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/core/api/client';
import { agruparPorDia, registroFrase } from '@/features/registros/utils/registroLabels';

import { listRegistros, normalizeRegistro } from './registros.service';

vi.mock('@/core/api/client', () => ({ api: { get: vi.fn() }, unwrapData: (value: any) => value?.data ?? value }));

describe('normalizeRegistro', () => {
  it('aceita o formato em inglês e alterações em objeto', () => {
    const registro = normalizeRegistro({ id: 9, timestamp: '2026-10-03T10:00:00Z', user: { id: 2, name: 'Ana', image: 'https://i/a.jpg' }, action: 'update', entity: 'venda', entityId: 55, changes: { status: { before: 'PENDENTE', after: 'PAGO' } } });
    expect(registro).toMatchObject({ id: '9', acao: 'ATUALIZAR', entidade: 'VENDA', entidadeId: '55', autor: { id: '2', nome: 'Ana', fotoUrl: 'https://i/a.jpg' } });
    expect(registro.alteracoes).toEqual([{ campo: 'status', antes: 'PENDENTE', depois: 'PAGO' }]);
  });

  it('ação desconhecida vira OUTRO e sem autor é o sistema', () => {
    const registro = normalizeRegistro({ id: 1, acao: 'QUALQUER', entidade: 'PAGAMENTO' });
    expect(registro.acao).toBe('OUTRO');
    expect(registroFrase(registro)).toBe('Sistema executou uma ação em pagamento');
  });
});

describe('registroFrase', () => {
  it('monta a frase com área e identificador', () => {
    const registro = normalizeRegistro({ id: 1, acao: 'EXCLUIR', entidade: 'CLIENTE', entidadeId: '12', autor: { nome: 'Maria' } });
    expect(registroFrase(registro)).toBe('Maria excluiu cliente #12');
  });

  it('acesso não cita área', () => {
    expect(registroFrase(normalizeRegistro({ id: 1, acao: 'LOGIN', entidade: 'AUTENTICACAO', autor: { nome: 'Maria' } }))).toBe('Maria entrou no painel');
  });
});

describe('agruparPorDia', () => {
  it('agrupa itens consecutivos do mesmo dia', () => {
    const now = new Date(2026, 9, 3, 12);
    const groups = agruparPorDia([
      normalizeRegistro({ id: 1, createdAt: new Date(2026, 9, 3, 10).toISOString() }),
      normalizeRegistro({ id: 2, createdAt: new Date(2026, 9, 3, 9).toISOString() }),
      normalizeRegistro({ id: 3, createdAt: new Date(2026, 9, 2, 9).toISOString() })
    ], now);
    expect(groups.map((group) => [group.dia, group.itens.length])).toEqual([['Hoje', 2], ['Ontem', 1]]);
  });
});

describe('listRegistros', () => {
  beforeEach(() => { vi.mocked(api.get).mockReset(); });

  it('envia filtros e lê a página', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [{ id: 1, acao: 'CRIAR', entidade: 'VENDA' }], total: 40, page: 2, limit: 30 } });
    const page = await listRegistros({ page: 2, acao: ['CRIAR', 'EXCLUIR'] });
    expect(api.get).toHaveBeenCalledWith('/admin/registros', { params: expect.objectContaining({ page: 2, limit: 30, acao: 'CRIAR,EXCLUIR' }) });
    expect(page).toMatchObject({ total: 40, page: 2 });
    expect(page.data[0].acao).toBe('CRIAR');
  });

  it('sinaliza quando a API ainda não tem a rota', async () => {
    vi.mocked(api.get).mockImplementation(async () => { throw { status: 404 }; });
    expect(await listRegistros()).toMatchObject({ data: [], indisponivel: true });
  });
});

describe('rótulos de alteração', () => {
  it('humaniza campo e valores de enum', async () => {
    const { campoLabel, formatValorAlteracao } = await import('@/features/registros/utils/registroLabels');
    expect(campoLabel('formaPagamento')).toBe('Forma de pagamento');
    expect(campoLabel('dataInicioAulas')).toBe('Data inicio aulas');
    expect(formatValorAlteracao('CARTAO_CREDITO')).toBe('Cartao credito');
    expect(formatValorAlteracao('Pix')).toBe('Pix');
    expect(formatValorAlteracao(null)).toBe('—');
  });
});
