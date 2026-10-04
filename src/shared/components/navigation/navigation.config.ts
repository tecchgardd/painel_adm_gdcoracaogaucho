import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { pode } from '@/core/permissions/permissoes';
import type { UserRole } from '@/shared/types/entities';

export type NavItem = {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  path?: string;
  children?: NavItem[];
  /**
   * Permissão exigida (`modulo.ver`, ver `src/core/permissions/catalogo.ts`); com uma lista, basta uma delas.
   * Grupos sem permissão própria aparecem quando algum filho aparece.
   */
  permissao?: string | string[];
  /** Título do bloco na sidebar; aplicado ao primeiro item de cada bloco. */
  section?: string;
  /** Rotas extras (sem entrada própria no menu) em que este item aparece como ativo. */
  activeOn?: string[];
  /** Termos extras para a busca rápida (Ctrl/⌘+K), ex.: 'aluno' encontra Pessoas. */
  keywords?: string[];
};

export type FlatNavItem = NavItem & { path: string; parent?: string };

export const navigationItems: NavItem[] = [
  { label: 'Dashboard', icon: 'view-dashboard-outline', path: '/dashboard', permissao: 'dashboard.ver', section: 'Principal' },
  {
    label: 'Eventos',
    icon: 'calendar-month-outline',
    activeOn: ['/eventos'],
    children: [
      { label: 'Bailes', icon: 'music-circle-outline', path: '/bailes', permissao: 'eventos.ver' },
      { label: 'Cursos', icon: 'school-outline', path: '/cursos', permissao: 'eventos.ver' }
    ]
  },
  // Link direto para o scanner; o histórico é aberto pelo botão "Histórico" da própria tela.
  { label: 'Check-in', icon: 'qrcode-scan', path: '/scanner', permissao: 'checkin.ver', activeOn: ['/historico-validacoes'] },
  {
    label: 'Comercial',
    icon: 'cart-outline',
    section: 'Operação',
    // Só ingressos (eventos/bailes) e inscrições (cursos); venda de produtos (Pedidos) está fora do escopo.
    children: [
      { label: 'Vendas', icon: 'cash-register', path: '/vendas', permissao: 'vendas.ver' },
      { label: 'Ingressos', icon: 'ticket-outline', path: '/ingressos', permissao: 'ingressos.ver' },
      { label: 'Inscrições', icon: 'school-outline', path: '/alunos', permissao: 'inscricoes.ver' },
      { label: 'Pagamentos', icon: 'cash-multiple', path: '/pagamentos', permissao: 'pagamentos.ver' },
      { label: 'Cortesias', icon: 'ticket-percent-outline', path: '/cortesias', permissao: 'cortesias.ver' }
    ]
  },
  {
    label: 'Cadastros',
    icon: 'account-group-outline',
    children: [
      { label: 'Pessoas', icon: 'account-outline', path: '/clientes', permissao: 'pessoas.ver', keywords: ['clientes', 'alunos', 'compradores', 'cpf'] },
      { label: 'Empresas', icon: 'office-building-outline', path: '/empresas', permissao: 'empresas.ver' },
      { label: 'Colaboradores', icon: 'account-multiple-outline', path: '/colaboradores', permissao: 'colaboradores.ver' }
    ]
  },
  { label: 'Relatórios', icon: 'chart-box-outline', path: '/relatorios', permissao: 'relatorios.ver', section: 'Análise' },
  { label: 'Fotos', icon: 'image-multiple-outline', path: '/fotos', permissao: 'fotos.ver' },
  { label: 'Agente IA', icon: 'robot-outline', path: '/agente-ia', permissao: 'agente-ia.ver' },
  { label: 'Perfis de acesso', icon: 'shield-account-outline', path: '/perfis', permissao: 'perfis.ver', section: 'Administração', keywords: ['permissões', 'acessos', 'usuários', 'papéis', 'glpi'] },
  { label: 'Registro de atividades', icon: 'clipboard-text-clock-outline', path: '/registros', permissao: 'registros.ver' }
];

export const mobileTabs: NavItem[] = [
  { label: 'Dashboard', icon: 'view-dashboard-outline', path: '/dashboard', permissao: 'dashboard.ver' },
  { label: 'Scanner', icon: 'qrcode-scan', path: '/scanner', permissao: 'checkin.ver' },
  { label: 'Eventos', icon: 'calendar-month-outline', path: '/eventos', permissao: 'eventos.ver' },
  { label: 'Gestão', icon: 'view-grid-plus-outline', path: '/gestao', permissao: ['vendas.ver', 'ingressos.ver', 'inscricoes.ver', 'pagamentos.ver', 'cortesias.ver', 'pessoas.ver', 'empresas.ver', 'colaboradores.ver'] },
  { label: 'Menu', icon: 'menu', path: '/menu' }
];

export function normalizePathname(pathname: string) {
  return pathname.replace('/(admin)', '') || '/';
}

export function isPathActive(pathname: string, path?: string) {
  if (!path) return false;
  return normalizePathname(pathname) === path;
}

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (isPathActive(pathname, item.path)) return true;
  if (item.activeOn?.some((path) => isPathActive(pathname, path))) return true;
  return item.children?.some((child) => isNavItemActive(child, pathname)) ?? false;
}

export function canAccessNavItem(item: NavItem, permissoes: readonly string[]) {
  if (!item.permissao) return true;
  return (Array.isArray(item.permissao) ? item.permissao : [item.permissao]).some((chave) => pode(permissoes, chave));
}

/** Itens que o perfil enxerga; grupos sem nenhum filho visível somem. */
export function filterNavigation(items: NavItem[], permissoes: readonly string[]): NavItem[] {
  return items
    .filter((item) => canAccessNavItem(item, permissoes))
    .map((item) => ({
      ...item,
      children: item.children ? filterNavigation(item.children, permissoes) : undefined
    }))
    .filter((item) => item.path || item.children?.length);
}

/** Lista plana de destinos navegáveis (folhas), usada pela busca rápida. */
export function flattenNavigation(items: NavItem[], parent?: string): FlatNavItem[] {
  return items.flatMap((item) => {
    const self: FlatNavItem[] = item.path && !item.children?.length ? [{ ...item, path: item.path, parent }] : [];
    return [...self, ...(item.children ? flattenNavigation(item.children, item.label) : [])];
  });
}

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function searchNavigation(items: FlatNavItem[], query: string) {
  const term = normalizeSearch(query);
  if (!term) return items;
  return items.filter((item) => normalizeSearch(`${item.label} ${item.parent ?? ''} ${(item.keywords ?? []).join(' ')}`).includes(term));
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  STAFF: 'Atendimento',
  CHECKIN: 'Check-in'
};

// Seção de cada item de topo, propagada a partir do primeiro item do bloco; assim o título da
// seção continua aparecendo mesmo quando o filtro por permissão remove justamente esse primeiro item.
const sectionByLabel = new Map<string, string | undefined>();
navigationItems.reduce<string | undefined>((current, item) => {
  const section = item.section ?? current;
  sectionByLabel.set(item.label, section);
  return section;
}, undefined);

/** Título de seção a exibir antes de `items[index]` (só quando a seção muda). */
export function sectionHeadingAt(items: NavItem[], index: number) {
  const section = sectionByLabel.get(items[index].label);
  const previous = index > 0 ? sectionByLabel.get(items[index - 1].label) : undefined;
  return section !== previous ? section : undefined;
}
