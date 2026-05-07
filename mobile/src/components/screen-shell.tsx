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
      <View style={styles.frame}>
        <View pointerEvents="none" style={styles.backdrop}>
          <View
            style={[
              styles.orb,
              styles.orbPrimary,
              { backgroundColor: theme.colors.brandGlow },
            ]}
          />
          <View
            style={[
              styles.orb,
              styles.orbSecondary,
              { backgroundColor: theme.colors.highlightSoft },
            ]}
          />
          <View
            style={[
              styles.ribbon,
              { backgroundColor: theme.colors.tintSoft, borderColor: theme.colors.border },
            ]}
          />
        </View>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[
              styles.content,
              {
                paddingHorizontal: theme.spacing.md,
                paddingBottom: theme.spacing["2xl"],
              },
              contentStyle,
            ]}
          >
            <View
              style={[
                styles.headerCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  shadowColor: theme.colors.foreground,
                },
              ]}
            >
              <View style={styles.headerTop}>
                {eyebrow ? (
                  <Text style={[styles.eyebrow, { color: theme.colors.accent }]}>
                    {eyebrow}
                  </Text>
                ) : (
                  <View />
                )}
                <View
                  style={[
                    styles.headerDot,
                    { backgroundColor: theme.colors.highlight },
                  ]}
                />
              </View>
              <Text style={[styles.title, { color: theme.colors.foreground }]}>
                {title}
              </Text>
              {subtitle ? (
                <Text
                  style={[
                    styles.subtitle,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {children}
          </ScrollView>
        ) : (
          <View
            style={[
              styles.content,
              {
                paddingHorizontal: theme.spacing.md,
                paddingBottom: theme.spacing["2xl"],
              },
              contentStyle,
            ]}
          >
            <View
              style={[
                styles.headerCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  shadowColor: theme.colors.foreground,
                },
              ]}
            >
              <View style={styles.headerTop}>
                {eyebrow ? (
                  <Text style={[styles.eyebrow, { color: theme.colors.accent }]}>
                    {eyebrow}
                  </Text>
                ) : (
                  <View />
                )}
                <View
                  style={[
                    styles.headerDot,
                    { backgroundColor: theme.colors.highlight },
                  ]}
                />
              </View>
              <Text style={[styles.title, { color: theme.colors.foreground }]}>
                {title}
              </Text>
              {subtitle ? (
                <Text
                  style={[
                    styles.subtitle,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {children}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  frame: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  orb: {
    position: "absolute",
    borderRadius: 999,
  },
  orbPrimary: {
    width: 220,
    height: 220,
    top: -90,
    right: -50,
  },
  orbSecondary: {
    width: 180,
    height: 180,
    top: 90,
    left: -70,
  },
  ribbon: {
    position: "absolute",
    top: 78,
    right: 24,
    width: 132,
    height: 132,
    borderRadius: 40,
    borderWidth: 1,
    transform: [{ rotate: "16deg" }],
    opacity: 0.7,
  },
  content: {
    gap: 16,
  },
  headerCard: {
    marginTop: 8,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 8,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  headerDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  title: {
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    maxWidth: "92%",
  },
});
