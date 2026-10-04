import { useEffect, useState } from 'react';
import { Tabs, router, usePathname } from 'expo-router';

import { rotaInicial, rotaPermitida } from '@/core/permissions/permissoes';
import { useAuthStore } from '@/stores/auth.store';

const hidden = { href: null };

export default function AdminTabs() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const loadSession = useAuthStore((state) => state.loadSession);
  const user = useAuthStore((state) => state.user);
  const permissoes = useAuthStore((state) => state.permissoes);

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

  // Cada rota exige `<modulo>.ver` do perfil (src/core/permissions); sem ela, vai para a primeira tela permitida.
  useEffect(() => {
    if (!ready || !user) return;
    if (!rotaPermitida(permissoes, pathname)) router.replace(rotaInicial(permissoes) as never);
  }, [pathname, permissoes, ready, user]);

  if (!ready) return null;

  return <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
    <Tabs.Screen name="dashboard" options={{ href: '/dashboard' }} />
    <Tabs.Screen name="scanner" options={{ href: '/scanner' }} />
    <Tabs.Screen name="eventos" options={{ href: '/eventos' }} />
    <Tabs.Screen name="gestao" options={{ href: '/gestao' }} />
    {['menu','bailes','cursos','cadastros','clientes','pedidos','ingressos','vendas','colaboradores','alunos','pagamentos','cortesias','historico-validacoes','relatorios','fotos','configuracoes','empresas','agente-ia','registros','perfis','perfil','ajuda','sobre'].map((name) => <Tabs.Screen key={name} name={name} options={hidden} />)}
  </Tabs>;
}
