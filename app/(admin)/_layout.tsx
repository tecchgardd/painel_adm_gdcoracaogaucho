import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { router, usePathname } from 'expo-router';
import { clearBusinessStorage } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import type { SessionUser } from '@/types/entities';

const hidden = { href: null };
const checkinAllowed = ['/scanner', '/historico-validacoes'];
const staffBlocked = ['/relatorios'];

export default function AdminTabs() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const loadSession = useAuthStore((state) => state.loadSession);

  useEffect(() => {
    let mounted = true;
    async function guard() {
      try {
        await clearBusinessStorage();
        const user: SessionUser | null | undefined = await loadSession();
        if (!mounted) return;
        if (!user) {
          router.replace('/login');
          return;
        }
        const normalized = pathname.replace('/(admin)', '');
        if (user.role === 'CHECKIN' && !checkinAllowed.includes(normalized)) {
          router.replace('/scanner');
          return;
        }
        if (user.role === 'STAFF' && staffBlocked.includes(normalized)) {
          router.replace('/dashboard');
          return;
        }
      } catch {
        if (mounted) router.replace('/login');
        return;
      } finally {
        if (mounted) setReady(true);
      }
    }
    guard();
    return () => { mounted = false; };
  }, [pathname]);

  if (!ready) return null;

  return <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
    <Tabs.Screen name="dashboard" options={{ href: '/dashboard' }} />
    <Tabs.Screen name="scanner" options={{ href: '/scanner' }} />
    <Tabs.Screen name="eventos" options={{ href: '/eventos' }} />
    <Tabs.Screen name="gestao" options={{ href: '/gestao' }} />
    <Tabs.Screen name="menu" options={{ href: '/menu' }} />
    {['bailes','cursos','cadastros','clientes','pedidos','ingressos','vendas','colaboradores','alunos','pagamentos','cortesias','historico-validacoes','relatorios','fotos'].map((name) => <Tabs.Screen key={name} name={name} options={hidden} />)}
  </Tabs>;
}
