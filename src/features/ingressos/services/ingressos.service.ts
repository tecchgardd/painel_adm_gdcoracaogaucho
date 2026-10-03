import { api, unwrapData } from '@/core/api/client';
import { ingressosDaVenda, ingressosDasVendas, vendaTemIngressos } from '@/features/ingressos/utils/ingressosDasVendas';
import { getSale, listSales } from '@/features/vendas/services/sales.service';
import type { Sale } from '@/shared/types/entities';

/*
 * Ingressos são emitidos pela venda (Vendas) ou pela cortesia (Cortesias). A antiga geração de
 * lotes com "origem financeira" (sem cobrança, venda existente...) saiu do painel.
 */

export async function listIngressos(params?: Record<string, string>) {
  const response = await api.get('/admin/ingressos', { params });
  return unwrapData<any[]>(response.data);
}

/** Aceita lista direta ou paginada (`{ data: [...] }`, `{ items: [...] }`). */
function asArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  const inner = (value as { data?: unknown; items?: unknown })?.data ?? (value as { items?: unknown })?.items;
  return Array.isArray(inner) ? inner : [];
}

const MAX_PAGINAS_VENDAS = 5;
const DETALHES_EM_PARALELO = 6;

/** Vendas de evento/baile com os ingressos individuais (busca o detalhe quando a lista não traz). */
async function carregarVendasComIngressos(): Promise<Sale[]> {
  const vendas: Sale[] = [];
  for (let page = 1; page <= MAX_PAGINAS_VENDAS; page += 1) {
    const result = await listSales({ page, limit: 100 });
    vendas.push(...(result.data ?? []));
    if (vendas.length >= (result.total ?? 0) || !(result.data ?? []).length) break;
  }
  const comIngressos = vendas.filter(vendaTemIngressos);
  const detalhadas: Sale[] = [];
  for (let index = 0; index < comIngressos.length; index += DETALHES_EM_PARALELO) {
    const lote = comIngressos.slice(index, index + DETALHES_EM_PARALELO);
    detalhadas.push(...await Promise.all(lote.map(async (sale) => {
      if (ingressosDaVenda(sale).length) return sale;
      try {
        return await getSale(String(sale.id));
      } catch {
        return sale;
      }
    })));
  }
  return detalhadas;
}

/**
 * Lista para a tela Ingressos. Usa `GET /admin/ingressos` quando a API devolve ingressos; enquanto essa
 * rota não existir (404) ou vier vazia, monta a lista a partir das vendas — a mesma fonte do documento
 * do ingresso (`raw.ingressos` no detalhe da venda).
 */
export async function listIngressosParaConsulta(): Promise<{ itens: any[]; fonte: 'api' | 'vendas' }> {
  let erroApi: unknown;
  try {
    const response = await api.get('/admin/ingressos');
    const itens = asArray(unwrapData<unknown>(response.data));
    if (itens.length) return { itens, fonte: 'api' };
  } catch (error) {
    erroApi = error;
  }
  try {
    return { itens: ingressosDasVendas(await carregarVendasComIngressos()), fonte: 'vendas' };
  } catch (error) {
    throw erroApi && (erroApi as { status?: number }).status !== 404 ? erroApi : error;
  }
}

export async function getIngresso(id: string) {
  const response = await api.get(`/admin/ingressos/${id}`);
  return unwrapData<any>(response.data);
}

/** Troca de portador (`portadorNome`, `portadorCpf`) ou cancelamento (`status: 'CANCELADO'`, `motivo`). */
export async function atualizarIngresso(id: string, data: Record<string, unknown>) {
  const response = await api.patch(`/admin/ingressos/${id}`, data);
  return unwrapData<any>(response.data);
}
