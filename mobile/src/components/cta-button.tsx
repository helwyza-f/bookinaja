import { Pressable, Text, ViewStyle } from "react-native";
import { adminUi } from "@/theme/admin-ui";

type CtaButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  tone?: "primary" | "secondary" | "danger";
  style?: ViewStyle;
};

const paletteMap = {
  primary: {
    backgroundColor: adminUi.colors.accent,
    borderColor: adminUi.colors.accent,
    textColor: "#ffffff",
    shadowColor: adminUi.colors.accent,
    shadowOpacity: 0.22,
    elevation: 4,
  },
  secondary: {
    backgroundColor: "rgba(255,255,255,0.86)",
    borderColor: adminUi.colors.accentSoft,
    textColor: adminUi.colors.accentStrong,
    shadowColor: adminUi.colors.accent,
    shadowOpacity: 0.06,
    elevation: 0,
  },
  danger: {
    backgroundColor: adminUi.tones.danger.soft,
    borderColor: adminUi.tones.danger.border,
    textColor: adminUi.tones.danger.text,
    shadowColor: "#7f1d1d",
    shadowOpacity: 0,
    elevation: 0,
  },
} as const;

export function CtaButton({
  label,
  onPress,
  disabled,
  tone = "primary",
  style,
}: CtaButtonProps) {
  const palette = paletteMap[tone];

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        justifyContent: "center",
        minHeight: 52,
        borderRadius: adminUi.radius.chip,
        borderWidth: 1,
        borderColor: palette.borderColor,
        backgroundColor: palette.backgroundColor,
        paddingHorizontal: 20,
        paddingVertical: 14,
        opacity: disabled ? 0.52 : pressed ? 0.9 : 1,
        shadowColor: palette.shadowColor,
        shadowOpacity: palette.shadowOpacity,
        shadowRadius: tone === "primary" ? 18 : 12,
        shadowOffset: { width: 0, height: tone === "primary" ? 12 : 6 },
        elevation: palette.elevation,
        transform: [{ scale: pressed ? 0.98 : 1 }],
        ...style,
      })}
    >
      <Text
        style={{
          color: palette.textColor,
          fontSize: 14,
          fontWeight: "800",
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
