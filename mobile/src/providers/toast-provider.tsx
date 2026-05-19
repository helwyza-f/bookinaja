import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { adminUi } from "@/theme/admin-ui";

type ToastTone = "success" | "error" | "info" | "warning";

type ToastInput = {
  title?: string;
  message: string;
  tone?: ToastTone;
  duration?: number;
};

type ToastItem = ToastInput & {
  id: string;
};

type ToastContextValue = {
  showToast: (input: ToastInput) => void;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function toneMeta(tone: ToastTone) {
  if (tone === "success") {
    return {
      icon: "check-circle-outline" as const,
      iconColor: "#059669",
      iconBg: "#ecfdf5",
      border: adminUi.tones.success.border,
      bg: "#ffffff",
      accent: "#10b981",
      title: "#14532d",
      message: "#166534",
    };
  }
  if (tone === "error") {
    return {
      icon: "alert-circle-outline" as const,
      iconColor: "#dc2626",
      iconBg: "#fff1f2",
      border: adminUi.tones.danger.border,
      bg: "#ffffff",
      accent: "#ef4444",
      title: "#881337",
      message: "#9f1239",
    };
  }
  if (tone === "warning") {
    return {
      icon: "alert-outline" as const,
      iconColor: "#d97706",
      iconBg: "#fff7ed",
      border: adminUi.tones.amber.border,
      bg: "#ffffff",
      accent: "#f59e0b",
      title: "#9a3412",
      message: "#b45309",
    };
  }
  return {
    icon: "information-outline" as const,
    iconColor: adminUi.colors.accent,
    iconBg: adminUi.tones.blue.soft,
    border: adminUi.tones.blue.border,
    bg: "#ffffff",
    accent: "#3b82f6",
    title: adminUi.colors.accent,
    message: adminUi.colors.textBase,
  };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current[id];
    if (timer) {
      clearTimeout(timer);
      delete timersRef.current[id];
    }
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (input: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const next: ToastItem = {
        id,
        tone: input.tone || "info",
        duration: input.duration || 2600,
        title: input.title,
        message: input.message,
      };
      setToasts((current) => [...current.slice(-2), next]);
      timersRef.current[id] = setTimeout(() => {
        dismissToast(id);
      }, next.duration);
    },
    [dismissToast],
  );

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((timer) => clearTimeout(timer));
      timersRef.current = {};
    };
  }, []);

  const value = useMemo(
    () => ({ showToast, dismissToast }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: Math.max(insets.top, 10) + 4,
          left: 0,
          right: 0,
          zIndex: 1000,
          paddingHorizontal: 16,
          gap: 10,
          alignItems: "center",
        }}
      >
        {toasts.map((toast) => {
          const meta = toneMeta(toast.tone || "info");
          return (
            <Animated.View
              key={toast.id}
              entering={FadeInDown.duration(180)}
              exiting={FadeOutUp.duration(160)}
              style={{ width: "100%", maxWidth: 520 }}
            >
              <Pressable
                onPress={() => dismissToast(toast.id)}
                style={{
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: meta.border,
                  backgroundColor: meta.bg,
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  shadowColor: adminUi.colors.shadow,
                  shadowOpacity: 0.08,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 4,
                }}
              >
                <View
                  style={{
                    width: 4,
                    alignSelf: "stretch",
                    borderRadius: 999,
                    backgroundColor: meta.accent,
                  }}
                />
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 14,
                    backgroundColor: meta.iconBg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialCommunityIcons
                    name={meta.icon}
                    size={18}
                    color={meta.iconColor}
                  />
                </View>
                <View style={{ flex: 1, gap: toast.title ? 2 : 0 }}>
                  {toast.title ? (
                    <Text style={{ color: meta.title, fontSize: 12, fontWeight: "800" }}>
                      {toast.title}
                    </Text>
                  ) : null}
                  <Text
                    style={{
                      color: meta.message,
                      fontSize: 13,
                      lineHeight: 19,
                      fontWeight: "700",
                    }}
                  >
                    {toast.message}
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return value;
}
