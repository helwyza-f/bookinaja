import { useToastStore, type ToastTone } from "@/stores/toast-store";

function show(tone: ToastTone, title: string, message?: string, duration?: number) {
  return useToastStore.getState().show({ tone, title, message, duration });
}

export const appToast = {
  success: (title: string, message?: string, duration?: number) =>
    show("success", title, message, duration),
  error: (title: string, message?: string, duration?: number) =>
    show("error", title, message, duration),
  warning: (title: string, message?: string, duration?: number) =>
    show("warning", title, message, duration),
  info: (title: string, message?: string, duration?: number) =>
    show("info", title, message, duration),
};
