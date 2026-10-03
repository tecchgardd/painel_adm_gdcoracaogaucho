import { create } from 'zustand';

import { getMe, getSession, login as loginRequest, logout as logoutRequest } from '@/features/auth/services/auth.service';
import { setBiometricEnabled } from '@/features/auth/services/biometric.service';
import type { AuthSession, SessionUser, UserRole } from '@/shared/types/entities';

type AuthStore = {
  user: SessionUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  role: UserRole | null;
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

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  role: null,
  loading: false,
  login: async (identifier, password) => {
    set({ loading: true });
    try {
      const session = await loginRequest(identifier, password);
      const user = session.user ?? await getMe();
      set({ user: user ?? null, session, isAuthenticated: !!user, role: getRole(user), loading: false });
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
      set({ user: null, session: null, isAuthenticated: false, role: null, loading: false });
    }
  },
  loadSession: async () => {
    set({ loading: true });
    try {
      const session: AuthSession | null = await getSession();
      const user = session.user ?? null;
      set({ user, session, isAuthenticated: !!user, role: getRole(user), loading: false });
      return user;
    } catch (error) {
      set({ user: null, session: null, isAuthenticated: false, role: null, loading: false });
      throw error;
    }
  }
}));
