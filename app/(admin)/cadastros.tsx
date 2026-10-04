import { OptionGroupScreen } from '@/shared/components/navigation/OptionGroupScreen';
import { filterNavigation, navigationItems } from '@/shared/components/navigation/navigation.config';
import { useAuthStore } from '@/stores/auth.store';

export default function Cadastros() {
  const permissoes = useAuthStore((state) => state.permissoes);
  const group = filterNavigation(navigationItems, permissoes).find((item) => item.label === 'Cadastros');
  return <OptionGroupScreen title="Cadastros" items={group?.children ?? []} />;
}
