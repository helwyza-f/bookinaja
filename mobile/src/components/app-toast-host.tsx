import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppTheme } from "@/theme";
import { useToastStore, type ToastTone } from "@/stores/toast-store";

function toneStyles(
  tone: ToastTone,
  colors: ReturnType<typeof useAppTheme>["colors"],
) {
  if (tone === "success") {
    return {
      backgroundColor: colors.successSoft,
      borderColor: colors.success,
      iconColor: colors.success,
    };
  }
  if (tone === "warning") {
    return {
      backgroundColor: colors.warningSoft,
      borderColor: colors.warning,
      iconColor: colors.warning,
    };
  }
  if (tone === "error") {
    return {
      backgroundColor: colors.dangerSoft,
      borderColor: colors.danger,
      iconColor: colors.danger,
    };
  }
  return {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    iconColor: colors.accent,
  };
}

function toneIcon(tone: ToastTone): React.ComponentProps<typeof Feather>["name"] {
  if (tone === "success") return "check-circle";
  if (tone === "warning") return "alert-triangle";
  if (tone === "error") return "x-circle";
  return "info";
}

export function AppToastHost() {
  const theme = useAppTheme();
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  if (toasts.length === 0) return null;

  return (
    <View pointerEvents="box-none" style={styles.viewport}>
      <View style={styles.stack}>
        {toasts.map((toast) => {
          const tone = toneStyles(toast.tone, theme.colors);
          return (
            <Pressable
              key={toast.id}
              onPress={() => dismiss(toast.id)}
              style={[
                styles.toast,
                {
                  backgroundColor: tone.backgroundColor,
                  borderColor: tone.borderColor,
                  shadowColor: theme.colors.foreground,
                },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: theme.colors.background }]}>
                <Feather name={toneIcon(toast.tone)} size={16} color={tone.iconColor} />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.title, { color: theme.colors.foreground }]}>{toast.title}</Text>
                {toast.message ? (
                  <Text style={[styles.message, { color: theme.colors.foregroundMuted }]}>
                    {toast.message}
                  </Text>
                ) : null}
              </View>
              <Feather name="x" size={16} color={theme.colors.foregroundMuted} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-start",
    paddingHorizontal: 14,
    paddingTop: 58,
  },
  stack: {
    gap: 10,
  },
  toast: {
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
  },
  message: {
    fontSize: 12,
    lineHeight: 17,
  },
});
