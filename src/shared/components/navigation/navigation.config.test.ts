import { describe, expect, it } from 'vitest';

import { perfilPadraoDoRole } from '@/core/permissions/catalogo';
import { normalizarPermissoes } from '@/core/permissions/permissoes';
import type { UserRole } from '@/shared/types/entities';

import {
  filterNavigation,
  flattenNavigation,
  isNavItemActive,
  mobileTabs,
  navigationItems,
  searchNavigation,
  sectionHeadingAt
} from './navigation.config';

const filterNavigationByRole = (items: typeof navigationItems, role: UserRole) => filterNavigation(items, normalizarPermissoes(perfilPadraoDoRole(role)!.permissoes));

describe('navigation.config', () => {
  it('aponta cada destino para uma rota própria (sem filhos duplicando o pai)', () => {
    const paths = flattenNavigation(navigationItems).map((item) => item.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toEqual(expect.arrayContaining(['/bailes', '/cursos', '/scanner', '/vendas', '/ingressos', '/alunos', '/pagamentos', '/cortesias']));
    expect(paths).not.toContain('/pedidos');
  });

  it('esconde relatórios e colaboradores de STAFF, como o guard do layout', () => {
    const paths = flattenNavigation(filterNavigationByRole(navigationItems, 'STAFF')).map((item) => item.path);
    expect(paths).not.toContain('/relatorios');
    expect(paths).not.toContain('/colaboradores');
    expect(paths).not.toContain('/registros');
    expect(paths).toContain('/vendas');
  });

  it('CHECKIN só enxerga o check-in', () => {
    const paths = flattenNavigation(filterNavigationByRole(navigationItems, 'CHECKIN')).map((item) => item.path);
    expect(paths).toEqual(['/scanner']);
  });

  it('marca o grupo como ativo quando uma rota filha está aberta', () => {
    const eventos = navigationItems.find((item) => item.label === 'Eventos')!;
    expect(isNavItemActive(eventos, '/(admin)/bailes')).toBe(true);
    expect(isNavItemActive(eventos, '/vendas')).toBe(false);
  });

  it('busca ignora acentos e considera o grupo pai', () => {
    const flat = flattenNavigation(navigationItems);
    expect(searchNavigation(flat, 'relatorio').map((item) => item.path)).toEqual(['/relatorios']);
    expect(searchNavigation(flat, 'check-in').map((item) => item.path)).toEqual(['/scanner']);
  });
});

describe('sectionHeadingAt', () => {
  it('mantém o título da seção quando o primeiro item do bloco é filtrado', () => {
    const staff = filterNavigationByRole(navigationItems, 'STAFF');
    const headings = staff.map((_, index) => sectionHeadingAt(staff, index)).filter(Boolean);
    expect(headings).toEqual(['Principal', 'Operação', 'Análise']);
  });
});

describe('activeOn', () => {
  it('mantém o item destacado em rotas sem entrada própria no menu', () => {
    const checkin = navigationItems.find((item) => item.label === 'Check-in')!;
    const eventos = navigationItems.find((item) => item.label === 'Eventos')!;
    expect(checkin.children).toBeUndefined();
    expect(isNavItemActive(checkin, '/(admin)/historico-validacoes')).toBe(true);
    expect(isNavItemActive(eventos, '/eventos')).toBe(true);
    expect(eventos.children?.map((child) => child.label)).toEqual(['Bailes', 'Cursos']);
  });
});

describe('Comercial', () => {
  it('reúne vendas, ingressos, inscrições, pagamentos e cortesias, sem pedidos de produtos', () => {
    const comercial = navigationItems.find((item) => item.label === 'Comercial')!;
    expect(comercial.children?.map((child) => child.label)).toEqual(['Vendas', 'Ingressos', 'Inscrições', 'Pagamentos', 'Cortesias']);
    const cadastros = navigationItems.find((item) => item.label === 'Cadastros')!;
    expect(cadastros.children?.map((child) => child.path)).not.toContain('/alunos');
  });
});

describe('Pessoas', () => {
  it('a busca rápida encontra Pessoas por "aluno" e "cliente"', () => {
    const flat = flattenNavigation(navigationItems);
    expect(searchNavigation(flat, 'aluno').map((item) => item.path)).toContain('/clientes');
    expect(searchNavigation(flat, 'cliente').map((item) => item.path)).toContain('/clientes');
  });
});

describe('permissões', () => {
  it('ADMIN vê Perfis de acesso e o registro numa seção Administração', () => {
    const admin = filterNavigationByRole(navigationItems, 'ADMIN');
    expect(flattenNavigation(admin).map((item) => item.path)).toEqual(expect.arrayContaining(['/perfis', '/registros']));
    expect(admin.map((_, index) => sectionHeadingAt(admin, index)).filter(Boolean)).toEqual(['Principal', 'Operação', 'Análise', 'Administração']);
  });

  it('um perfil só com Pagamentos vê só Comercial → Pagamentos', () => {
    const itens = filterNavigation(navigationItems, normalizarPermissoes(['pagamentos.editar']));
    expect(itens.map((item) => item.label)).toEqual(['Comercial']);
    expect(itens[0].children?.map((item) => item.path)).toEqual(['/pagamentos']);
  });

  it('a aba Gestão aparece quando o perfil tem algum módulo de gestão', () => {
    expect(filterNavigation(mobileTabs, ['checkin.ver']).map((item) => item.path)).toEqual(['/scanner', '/menu']);
    expect(filterNavigation(mobileTabs, ['empresas.ver']).map((item) => item.path)).toEqual(['/gestao', '/menu']);
  });
});
