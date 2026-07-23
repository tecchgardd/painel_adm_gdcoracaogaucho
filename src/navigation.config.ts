import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { UserRole } from '@/types/entities';

export type NavItem = {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  path?: string;
  children?: NavItem[];
  roles?: UserRole[];
};

export const navigationItems: NavItem[] = [
  { label: 'Dashboard', icon: 'home-outline', path: '/dashboard', roles: ['ADMIN', 'STAFF'] },
  {
    label: 'Eventos',
    icon: 'calendar-month-outline',
    path: '/eventos',
    roles: ['ADMIN', 'STAFF'],
    children: [
      { label: 'Bailes', icon: 'music-circle-outline', path: '/eventos', roles: ['ADMIN', 'STAFF'] },
      { label: 'Cursos', icon: 'school-outline', path: '/eventos', roles: ['ADMIN', 'STAFF'] },
      { label: 'Eventos gerais', icon: 'calendar-star', path: '/eventos', roles: ['ADMIN', 'STAFF'] }
    ]
  },
  {
    label: 'Check-in',
    icon: 'qrcode-scan',
    roles: ['ADMIN', 'STAFF', 'CHECKIN'],
    children: [
      { label: 'Scanner QR Code', icon: 'qrcode-scan', path: '/scanner', roles: ['ADMIN', 'STAFF', 'CHECKIN'] },
      { label: 'Histórico de validações', icon: 'history', path: '/historico-validacoes', roles: ['ADMIN', 'STAFF', 'CHECKIN'] }
    ]
  },
  {
    label: 'Cadastros',
    icon: 'account-group-outline',
    roles: ['ADMIN', 'STAFF'],
    children: [
      { label: 'Colaboradores', icon: 'account-multiple-outline', path: '/colaboradores', roles: ['ADMIN'] },
      { label: 'Clientes', icon: 'account-outline', path: '/clientes', roles: ['ADMIN', 'STAFF'] },
      { label: 'Alunos', icon: 'school-outline', path: '/alunos', roles: ['ADMIN', 'STAFF'] },
      { label: 'Empresas', icon: 'office-building-outline', path: '/empresas', roles: ['ADMIN', 'STAFF'] }
    ]
  },
  {
    label: 'Vendas',
    icon: 'cart-outline',
    roles: ['ADMIN', 'STAFF'],
    children: [
      { label: 'Vendas', icon: 'cash-register', path: '/vendas', roles: ['ADMIN', 'STAFF'] },
      { label: 'Pagamentos', icon: 'cash-multiple', path: '/pagamentos', roles: ['ADMIN', 'STAFF'] }
    ]
  },
  { label: 'Relatórios', icon: 'chart-bar', path: '/relatorios', roles: ['ADMIN', 'STAFF'] },
  { label: 'Fotos', icon: 'image-multiple-outline', path: '/fotos', roles: ['ADMIN', 'STAFF'] }
];

export const mobileTabs: NavItem[] = [
  { label: 'Dashboard', icon: 'home-outline', path: '/dashboard', roles: ['ADMIN', 'STAFF'] },
  { label: 'Scanner', icon: 'qrcode-scan', path: '/scanner', roles: ['ADMIN', 'STAFF', 'CHECKIN'] },
  { label: 'Eventos', icon: 'calendar-month-outline', path: '/eventos', roles: ['ADMIN', 'STAFF'] },
  { label: 'Gestão', icon: 'view-grid-plus-outline', path: '/gestao', roles: ['ADMIN', 'STAFF'] }
];

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
