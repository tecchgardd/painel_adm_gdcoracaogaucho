import { useEffect, useState } from 'react';
import { Tabs, router, usePathname } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';

const hidden = { href: null };
const checkinAllowed = ['/scanner', '/historico-validacoes'];
const staffBlocked = ['/relatorios'];

export default function AdminTabs() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const loadSession = useAuthStore((state) => state.loadSession);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);

  useEffect(() => {
    let mounted = true;
    async function guard() {
      if (user) {
        setReady(true);
        return;
      }
      try {
        const sessionUser = await loadSession();
        if (!mounted) return;
        if (!sessionUser) {
          router.replace('/login');
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
  }, [loadSession, user]);

  useEffect(() => {
    if (!ready || !role) return;
    const normalized = pathname.replace('/(admin)', '');
    if (role === 'CHECKIN' && !checkinAllowed.includes(normalized)) router.replace('/scanner');
    else if (role === 'STAFF' && staffBlocked.includes(normalized)) router.replace('/dashboard');
  }, [pathname, ready, role]);

  if (!ready) return null;

  return <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
    <Tabs.Screen name="dashboard" options={{ href: '/dashboard' }} />
    <Tabs.Screen name="scanner" options={{ href: '/scanner' }} />
    <Tabs.Screen name="eventos" options={{ href: '/eventos' }} />
    <Tabs.Screen name="gestao" options={{ href: '/gestao' }} />
    {['menu','bailes','cursos','cadastros','clientes','pedidos','ingressos','vendas','colaboradores','alunos','pagamentos','cortesias','historico-validacoes','relatorios','fotos','configuracoes','empresas'].map((name) => <Tabs.Screen key={name} name={name} options={hidden} />)}
  </Tabs>;
}
