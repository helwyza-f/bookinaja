import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/theme";

export function InfoCard({
  label,
  value,
  hint,
  compact = false,
}: {
  label: string;
  value: string;
  hint?: string;
  compact?: boolean;
}) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        compact ? styles.cardCompact : styles.card,
        {
          backgroundColor: compact ? theme.colors.surface : theme.colors.card,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.foreground,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.accentPill,
            { backgroundColor: theme.colors.accentSoft },
          ]}
        >
          <Text
            style={[
              compact ? styles.labelCompact : styles.label,
              { color: theme.colors.accent },
            ]}
          >
            {label}
          </Text>
        </View>
      </View>
      <Text
        style={[
          compact ? styles.valueCompact : styles.value,
          { color: theme.colors.foreground },
        ]}
      >
        {value}
      </Text>
      {hint ? (
        <Text
          style={[
            compact ? styles.hintCompact : styles.hint,
            { color: theme.colors.foregroundMuted },
          ]}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    gap: 8,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  cardCompact: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    gap: 6,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  accentPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  label: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  labelCompact: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  valueCompact: {
    fontSize: 13,
    fontWeight: "900",
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
  },
  hintCompact: {
    fontSize: 10,
    lineHeight: 15,
  },
});
