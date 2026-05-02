import { create } from 'zustand';
import { Task } from '@/types';

interface TasksStore {
  tasks: Task[];
  loading: boolean;

  setTasks: (tasks: Task[]) => void;
  setLoading: (loading: boolean) => void;
  fetchTasks: () => Promise<void>;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
}

export const useTasksStore = create<TasksStore>((set) => ({
  tasks: [],
  loading: false,

  setTasks: (tasks) => set({ tasks }),
  setLoading: (loading) => set({ loading }),

  fetchTasks: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/tasks');
      const data: unknown = await res.json();
      set({ tasks: Array.isArray(data) ? (data as Task[]) : [] });
    } catch (err) {
      console.error('[tasksStore] fetchTasks failed:', err);
    } finally {
      set({ loading: false });
    }
  },

  addTask: (task) => set((state) => ({
    tasks: [task, ...state.tasks],
  })),

  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map((t) =>
      t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
    ),
  })),

  removeTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id),
  })),
}));
