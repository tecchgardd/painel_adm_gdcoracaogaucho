import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import type { UserRole } from '@/shared/types/entities';

export type NavItem = {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  path?: string;
  children?: NavItem[];
  roles?: UserRole[];
  /** Título do bloco na sidebar; aplicado ao primeiro item de cada bloco. */
  section?: string;
  /** Rotas extras (sem entrada própria no menu) em que este item aparece como ativo. */
  activeOn?: string[];
  /** Termos extras para a busca rápida (Ctrl/⌘+K), ex.: 'aluno' encontra Pessoas. */
  keywords?: string[];
};

export type FlatNavItem = NavItem & { path: string; parent?: string };

const ALL: UserRole[] = ['ADMIN', 'STAFF', 'CHECKIN'];
const TEAM: UserRole[] = ['ADMIN', 'STAFF'];

export const navigationItems: NavItem[] = [
  { label: 'Dashboard', icon: 'view-dashboard-outline', path: '/dashboard', roles: TEAM, section: 'Principal' },
  {
    label: 'Eventos',
    icon: 'calendar-month-outline',
    roles: TEAM,
    activeOn: ['/eventos'],
    children: [
      { label: 'Bailes', icon: 'music-circle-outline', path: '/bailes', roles: TEAM },
      { label: 'Cursos', icon: 'school-outline', path: '/cursos', roles: TEAM }
    ]
  },
  // Link direto para o scanner; o histórico é aberto pelo botão "Histórico" da própria tela.
  { label: 'Check-in', icon: 'qrcode-scan', path: '/scanner', roles: ALL, activeOn: ['/historico-validacoes'] },
  {
    label: 'Comercial',
    icon: 'cart-outline',
    roles: TEAM,
    section: 'Operação',
    // Só ingressos (eventos/bailes) e inscrições (cursos); venda de produtos (Pedidos) está fora do escopo.
    children: [
      { label: 'Vendas', icon: 'cash-register', path: '/vendas', roles: TEAM },
      { label: 'Ingressos', icon: 'ticket-outline', path: '/ingressos', roles: TEAM },
      { label: 'Inscrições', icon: 'school-outline', path: '/alunos', roles: TEAM },
      { label: 'Pagamentos', icon: 'cash-multiple', path: '/pagamentos', roles: TEAM },
      { label: 'Cortesias', icon: 'ticket-percent-outline', path: '/cortesias', roles: TEAM }
    ]
  },
  {
    label: 'Cadastros',
    icon: 'account-group-outline',
    roles: TEAM,
    children: [
      { label: 'Pessoas', icon: 'account-outline', path: '/clientes', roles: TEAM, keywords: ['clientes', 'alunos', 'compradores', 'cpf'] },
      { label: 'Empresas', icon: 'office-building-outline', path: '/empresas', roles: TEAM },
      { label: 'Colaboradores', icon: 'account-multiple-outline', path: '/colaboradores', roles: ['ADMIN'] }
    ]
  },
  { label: 'Relatórios', icon: 'chart-box-outline', path: '/relatorios', roles: ['ADMIN'], section: 'Análise' },
  { label: 'Registro de atividades', icon: 'clipboard-text-clock-outline', path: '/registros', roles: ['ADMIN'] },
  { label: 'Fotos', icon: 'image-multiple-outline', path: '/fotos', roles: TEAM },
  { label: 'Agente IA', icon: 'robot-outline', path: '/agente-ia', roles: TEAM }
];

export const mobileTabs: NavItem[] = [
  { label: 'Dashboard', icon: 'view-dashboard-outline', path: '/dashboard', roles: TEAM },
  { label: 'Scanner', icon: 'qrcode-scan', path: '/scanner', roles: ALL },
  { label: 'Eventos', icon: 'calendar-month-outline', path: '/eventos', roles: TEAM },
  { label: 'Gestão', icon: 'view-grid-plus-outline', path: '/gestao', roles: TEAM },
  { label: 'Menu', icon: 'menu', path: '/menu', roles: ALL }
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

export function canAccessNavItem(item: NavItem, role?: UserRole | null) {
  if (!item.roles?.length) return true;
  if (!role) return false;
  const normalizedRole = String(role).toUpperCase() as UserRole;
  return item.roles.includes(normalizedRole);
}

export function filterNavigationByRole(items: NavItem[], role?: UserRole | null): NavItem[] {
  return items
    .filter((item) => canAccessNavItem(item, role))
    .map((item) => ({
      ...item,
      children: item.children ? filterNavigationByRole(item.children, role) : undefined
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
// seção continua aparecendo mesmo quando o filtro por role remove justamente esse primeiro item.
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
