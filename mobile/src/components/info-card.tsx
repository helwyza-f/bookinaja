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
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text
        style={[
          compact ? styles.labelCompact : styles.label,
          { color: theme.colors.foregroundMuted },
        ]}
      >
        {label}
      </Text>
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
    borderRadius: 22,
    padding: 14,
    gap: 6,
  },
  cardCompact: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  labelCompact: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 17,
    fontWeight: "800",
  },
  valueCompact: {
    fontSize: 14,
    fontWeight: "800",
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
  },
  hintCompact: {
    fontSize: 11,
    lineHeight: 15,
  },
});
