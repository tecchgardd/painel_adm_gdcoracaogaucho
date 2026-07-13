import { useResponsive } from '@/hooks/useResponsive';
import { BottomTabs } from './BottomTabs';
import { Sidebar } from './Sidebar';

export function AppNavigation() {
  const { isMobile } = useResponsive();
  return isMobile ? <BottomTabs /> : <Sidebar />;
}
