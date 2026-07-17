import { create } from 'zustand';
import { getMe, getSession, login as loginRequest, logout as logoutRequest } from '@/services/auth.service';
import type { AuthSession, SessionUser, UserRole } from '@/types/entities';

type AuthStore = {
  user: SessionUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
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
  login: async (email, password) => {
    set({ loading: true });
    try {
      const session = await loginRequest(email, password);
      const user = session.user ?? await getMe();
      set({ user: user ?? null, session, isAuthenticated: !!user, role: getRole(user), loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  logout: async () => {
    await logoutRequest();
    set({ user: null, session: null, isAuthenticated: false, role: null, loading: false });
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
