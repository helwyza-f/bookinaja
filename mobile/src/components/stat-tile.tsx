import { ReactNode } from "react";
import { Text, View } from "react-native";
import { adminUi } from "@/theme/admin-ui";

type StatTileProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: "blue" | "emerald" | "amber" | "violet" | "slate";
  icon?: ReactNode;
};

const toneMap = {
  blue: { bg: adminUi.tones.blue.bg, accent: adminUi.tones.blue.text },
  emerald: { bg: adminUi.tones.success.bg, accent: adminUi.tones.success.text },
  amber: { bg: adminUi.tones.amber.bg, accent: adminUi.tones.amber.text },
  violet: { bg: adminUi.tones.violet.bg, accent: adminUi.tones.violet.text },
  slate: { bg: adminUi.tones.slate.bg, accent: adminUi.tones.slate.text },
} as const;

export function StatTile({
  label,
  value,
  hint,
  tone = "slate",
  icon,
}: StatTileProps) {
  const colors = toneMap[tone];

  return (
    <View
      style={{
        flex: 1,
        minWidth: 132,
        minHeight: 116,
        borderRadius: adminUi.radius.control,
        backgroundColor: colors.bg,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 6,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <Text selectable style={{ color: colors.accent, fontSize: 9, fontWeight: "800", letterSpacing: 0.9 }}>
          {label.toUpperCase()}
        </Text>
        {icon}
      </View>
      <Text selectable style={{ color: adminUi.colors.textStrong, fontSize: 20, fontWeight: "900", letterSpacing: -0.3 }}>
        {value}
      </Text>
      {hint ? (
        <Text selectable style={{ color: adminUi.colors.textMuted, fontSize: 11, lineHeight: 17 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
