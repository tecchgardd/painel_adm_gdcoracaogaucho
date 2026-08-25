import { OptionGroupScreen } from '@/shared/components/navigation/OptionGroupScreen';
import { filterNavigationByRole, navigationItems } from '@/shared/components/navigation/navigation.config';
import { useAuthStore } from '@/stores/auth.store';

export default function Cadastros() {
  const role = useAuthStore((state) => state.role);
  const group = filterNavigationByRole(navigationItems, role).find((item) => item.label === 'Cadastros');
  return <OptionGroupScreen title="Cadastros" items={group?.children ?? []} />;
}
