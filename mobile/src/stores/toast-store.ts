import { create } from "zustand";

export type ToastTone = "success" | "error" | "warning" | "info";

export type AppToast = {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
  duration: number;
};

type ToastState = {
  toasts: AppToast[];
  show: (payload: Omit<AppToast, "id" | "duration"> & { duration?: number }) => string;
  dismiss: (id: string) => void;
  clear: () => void;
};

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (payload) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const next: AppToast = {
      id,
      tone: payload.tone,
      title: payload.title,
      message: payload.message,
      duration: payload.duration ?? 3200,
    };

    set((state) => ({
      toasts: [...state.toasts.filter((item) => item.id !== id), next].slice(-4),
    }));

    setTimeout(() => {
      get().dismiss(id);
    }, next.duration);

    return id;
  },
  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((item) => item.id !== id),
    })),
  clear: () => set({ toasts: [] }),
}));
