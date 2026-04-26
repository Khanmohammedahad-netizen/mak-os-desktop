import { create } from 'zustand';

export interface WindowState {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  icon?: string;
}

interface WindowStore {
  windows: WindowState[];
  activeWindowId: string | null;
  maxZIndex: number;
  
  openWindow: (id: string, title: string, icon?: string) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updatePosition: (id: string, position: { x: number; y: number }) => void;
  updateSize: (id: string, size: { width: number; height: number }) => void;
}

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

const APP_CONFIGS: Record<string, { width: number; height: number }> = {
  crm:       { width: 1100, height: 700 },
  deals:     { width: 1000, height: 680 },
  analytics: { width: 1000, height: 680 },
  notes:     { width: 900,  height: 600 },
  calendar:  { width: 900,  height: 640 },
};

export const useWindowStore = create<WindowStore>((set) => ({
  windows: [],
  activeWindowId: null,
  maxZIndex: 10,

  openWindow: (id, title, icon) => set((state) => {
    const existing = state.windows.find(w => w.id === id);
    if (existing) {
      if (existing.isMinimized) {
        return {
          windows: state.windows.map(w => 
            w.id === id ? { ...w, isMinimized: false, zIndex: state.maxZIndex + 1 } : w
          ),
          activeWindowId: id,
          maxZIndex: state.maxZIndex + 1
        };
      }
      return { 
        activeWindowId: id,
        windows: state.windows.map(w => 
          w.id === id ? { ...w, zIndex: state.maxZIndex + 1 } : w
        ),
        maxZIndex: state.maxZIndex + 1
      };
    }

    const cfg = APP_CONFIGS[id];
    const w = cfg?.width ?? DEFAULT_WIDTH;
    const h = cfg?.height ?? DEFAULT_HEIGHT;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
    const offset = state.windows.length * 24;
    const x = Math.max(40, Math.round((vw - w) / 2) + offset);
    const y = Math.max(44, Math.round((vh - h) / 2) + offset);

    const newWindow: WindowState = {
      id,
      title,
      icon,
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
      position: { x, y },
      size: { width: w, height: h },
      zIndex: state.maxZIndex + 1,
    };

    return {
      windows: [...state.windows, newWindow],
      activeWindowId: id,
      maxZIndex: state.maxZIndex + 1
    };
  }),

  closeWindow: (id) => set((state) => ({
    windows: state.windows.filter(w => w.id !== id),
    activeWindowId: state.activeWindowId === id ? null : state.activeWindowId
  })),

  minimizeWindow: (id) => set((state) => ({
    windows: state.windows.map(w => 
      w.id === id ? { ...w, isMinimized: true } : w
    ),
    activeWindowId: state.activeWindowId === id ? null : state.activeWindowId
  })),

  maximizeWindow: (id) => set((state) => ({
    windows: state.windows.map(w => 
      w.id === id ? { ...w, isMaximized: !w.isMaximized } : w
    )
  })),

  focusWindow: (id) => set((state) => ({
    windows: state.windows.map(w => 
      w.id === id ? { ...w, zIndex: state.maxZIndex + 1 } : w
    ),
    activeWindowId: id,
    maxZIndex: state.maxZIndex + 1
  })),

  updatePosition: (id, position) => set((state) => ({
    windows: state.windows.map(w => w.id === id ? { ...w, position } : w)
  })),

  updateSize: (id, size) => set((state) => ({
    windows: state.windows.map(w => w.id === id ? { ...w, size } : w)
  }))
}));
