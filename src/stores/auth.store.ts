import { create } from 'zustand';

import { permissoesDoUsuario, pode } from '@/core/permissions/permissoes';
import { getMe, getSession, login as loginRequest, logout as logoutRequest } from '@/features/auth/services/auth.service';
import { setBiometricEnabled } from '@/features/auth/services/biometric.service';
import type { AuthSession, SessionUser, UserRole } from '@/shared/types/entities';

type AuthStore = {
  user: SessionUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  /** Permissões efetivas (`modulo.acao`), já normalizadas; ver `src/core/permissions`. */
  permissoes: string[];
  loading: boolean;
  /** `identifier`: e-mail ou nome de usuário. */
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<SessionUser | null>;
};

function getRole(user?: SessionUser | null): UserRole | null {
  const role = user?.role ?? user?.tipoAcesso ?? user?.accessType;
  return role ? String(role).toUpperCase() as UserRole : null;
}

function sessionState(user: SessionUser | null, session: AuthSession | null) {
  const role = getRole(user);
  return { user, session, isAuthenticated: !!user, role, permissoes: permissoesDoUsuario(user, role) };
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  role: null,
  permissoes: [],
  loading: false,
  login: async (identifier, password) => {
    set({ loading: true });
    try {
      const session = await loginRequest(identifier, password);
      const user = session.user ?? await getMe();
      set({ ...sessionState(user ?? null, session), loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  logout: async () => {
    // Sair explicitamente desliga a biometria (a credencial lembrada deixa de valer) e a sessão
    // local é limpa mesmo se o sign-out no backend falhar; senão o guard do layout continuaria liberando.
    try {
      await setBiometricEnabled(false).catch(() => undefined);
      await logoutRequest();
    } finally {
      set({ ...sessionState(null, null), loading: false });
    }
  },
  loadSession: async () => {
    set({ loading: true });
    try {
      const session: AuthSession | null = await getSession();
      const user = session.user ?? null;
      set({ ...sessionState(user, session), loading: false });
      return user;
    } catch (error) {
      set({ ...sessionState(null, null), loading: false });
      throw error;
    }
  }
}));

/** `const podeCriar = usePode('vendas.criar')`: se o perfil do usuário logado tem a permissão. */
export function usePode(chave: string) {
  return useAuthStore((state) => pode(state.permissoes, chave));
}
