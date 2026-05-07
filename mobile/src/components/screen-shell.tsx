import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useAppTheme } from "@/theme";

type ScreenShellProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
};

export function ScreenShell({
  eyebrow,
  title,
  subtitle,
  children,
  scroll = true,
  contentStyle,
}: ScreenShellProps) {
  const theme = useAppTheme();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing["2xl"] },
            contentStyle,
          ]}
        >
          <View style={styles.header}>
            {eyebrow ? (
              <Text style={[styles.eyebrow, { color: theme.colors.accent }]}>{eyebrow}</Text>
            ) : null}
            <Text style={[styles.title, { color: theme.colors.foreground }]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: theme.colors.foregroundMuted }]}>{subtitle}</Text>
            ) : null}
          </View>
          {children}
        </ScrollView>
      ) : (
        <View
          style={[
            styles.content,
            { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing["2xl"] },
            contentStyle,
          ]}
        >
          <View style={styles.header}>
            {eyebrow ? (
              <Text style={[styles.eyebrow, { color: theme.colors.accent }]}>{eyebrow}</Text>
            ) : null}
            <Text style={[styles.title, { color: theme.colors.foreground }]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: theme.colors.foregroundMuted }]}>{subtitle}</Text>
            ) : null}
          </View>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    gap: 14,
  },
  header: {
    gap: 4,
    paddingTop: 6,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 25,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
});
