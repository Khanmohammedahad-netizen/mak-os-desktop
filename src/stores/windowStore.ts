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

    const newWindow: WindowState = {
      id,
      title,
      icon,
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
      position: { 
        x: 100 + (state.windows.length * 40), 
        y: 100 + (state.windows.length * 40) 
      },
      size: { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
      zIndex: state.maxZIndex + 1
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
