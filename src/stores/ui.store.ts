import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

// Preferência visual (não é credencial): AsyncStorage em todas as plataformas.
const SIDEBAR_COLLAPSED_KEY = '@cg_ui_sidebar_collapsed';

type UiStore = {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  /** Grupos da sidebar abertos; vive no store porque a sidebar remonta a cada tela. */
  openGroups: string[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleGroup: (label: string) => void;
  openGroup: (label: string) => void;
};

function persistCollapsed(collapsed: boolean) {
  AsyncStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0').catch(() => undefined);
}

export const useUiStore = create<UiStore>((set, get) => ({
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  openGroups: [],
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const stored = await AsyncStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      set({ sidebarCollapsed: stored === '1', hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  setSidebarCollapsed: (collapsed) => {
    persistCollapsed(collapsed);
    set({ sidebarCollapsed: collapsed });
  },
  toggleSidebar: () => get().setSidebarCollapsed(!get().sidebarCollapsed),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleGroup: (label) => set((state) => ({
    openGroups: state.openGroups.includes(label) ? state.openGroups.filter((item) => item !== label) : [...state.openGroups, label]
  })),
  openGroup: (label) => set((state) => (state.openGroups.includes(label) ? state : { openGroups: [...state.openGroups, label] }))
}));
