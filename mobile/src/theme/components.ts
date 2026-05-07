import { radius, spacing, typography } from "./tokens";
import type { ComponentTheme, ThemeCore } from "./types";

export function createComponentTheme(theme: ThemeCore): ComponentTheme {
  return {
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    card: {
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: radius.xl,
      padding: spacing.md,
    },
    buttonPrimary: {
      minHeight: 52,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: theme.colors.accent,
    },
    buttonSecondary: {
      minHeight: 52,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    buttonTextPrimary: {
      color: "#FFFFFF",
      fontSize: typography.size.base,
      fontWeight: typography.weight.semibold,
    },
    buttonTextSecondary: {
      color: theme.colors.foreground,
      fontSize: typography.size.base,
      fontWeight: typography.weight.semibold,
    },
    input: {
      minHeight: 52,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
      color: theme.colors.foreground,
    },
    label: {
      color: theme.colors.foregroundMuted,
      fontSize: typography.size.sm,
      fontWeight: typography.weight.medium,
    },
  };
}
