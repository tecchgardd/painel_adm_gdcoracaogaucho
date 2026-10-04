import { describe, expect, it } from 'vitest';

import { PERFIS_PADRAO, TODAS_PERMISSOES } from './catalogo';
import { nomeDoPerfil, normalizarPermissoes, permissoesDoUsuario, rotaInicial, rotaPermitida } from './permissoes';

describe('permissões', () => {
  it('chaves são únicas e seguem modulo.acao', () => {
    expect(new Set(TODAS_PERMISSOES).size).toBe(TODAS_PERMISSOES.length);
    TODAS_PERMISSOES.forEach((chave) => expect(chave).toMatch(/^[a-z-]+\.[a-z]+$/));
  });

  it('* vira todas; ação sem "ver" ganha o "ver"; chaves desconhecidas somem', () => {
    expect(normalizarPermissoes(['*'])).toEqual(TODAS_PERMISSOES);
    expect(normalizarPermissoes(['vendas.criar', 'inexistente.ver'])).toEqual(['vendas.ver', 'vendas.criar']);
  });

  it('sem permissões na sessão, usa o perfil padrão do role (comportamento antigo)', () => {
    const staff = permissoesDoUsuario({ role: 'STAFF' }, 'STAFF');
    expect(staff).toContain('vendas.criar');
    expect(staff).not.toContain('relatorios.ver');
    expect(staff).not.toContain('cortesias.criar');
    expect(staff).not.toContain('pagamentos.reembolsar');
    expect(permissoesDoUsuario({ role: 'CHECKIN' }, 'CHECKIN')).toEqual(['checkin.ver']);
    expect(permissoesDoUsuario({ role: 'ADMIN' }, 'ADMIN')).toEqual(TODAS_PERMISSOES);
    expect(permissoesDoUsuario(null, 'ADMIN')).toEqual([]);
  });

  it('permissões do perfil mandadas pelo backend têm prioridade sobre o role', () => {
    const user = { role: 'ADMIN' as const, perfil: { id: '9', nome: 'Financeiro', permissoes: ['pagamentos.editar'] } };
    expect(permissoesDoUsuario(user, 'ADMIN')).toEqual(['pagamentos.ver', 'pagamentos.editar']);
    expect(nomeDoPerfil(user, 'ADMIN')).toBe('Financeiro');
    expect(nomeDoPerfil({ role: 'STAFF' }, 'STAFF')).toBe('Atendimento');
  });

  it('rotas: exige modulo.ver, libera as telas pessoais e redireciona para a primeira permitida', () => {
    const portaria = PERFIS_PADRAO.find((perfil) => perfil.id === 'portaria')!.permissoes;
    expect(rotaPermitida(portaria, '/(admin)/scanner')).toBe(true);
    expect(rotaPermitida(portaria, '/historico-validacoes')).toBe(true);
    expect(rotaPermitida(portaria, '/vendas')).toBe(false);
    expect(rotaPermitida(portaria, '/perfil')).toBe(true);
    expect(rotaInicial(portaria)).toBe('/scanner');
    expect(rotaInicial(['pagamentos.ver'])).toBe('/pagamentos');
    expect(rotaInicial([])).toBe('/perfil');
    expect(rotaPermitida(['vendas.ver'], '/vendas?tipo=CURSO')).toBe(true);
  });
});
