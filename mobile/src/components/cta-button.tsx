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
    backgroundColor: adminUi.colors.accentStrong,
    borderColor: adminUi.colors.accentStrong,
    textColor: "#ffffff",
    shadowColor: adminUi.colors.accentStrong,
    shadowOpacity: 0.18,
    elevation: 3,
  },
  secondary: {
    backgroundColor: "#ffffff",
    borderColor: adminUi.colors.line,
    textColor: adminUi.colors.textStrong,
    shadowColor: adminUi.colors.shadow,
    shadowOpacity: 0.045,
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
        borderRadius: adminUi.radius.control,
        borderWidth: 1,
        borderColor: palette.borderColor,
        backgroundColor: palette.backgroundColor,
        paddingHorizontal: 18,
        paddingVertical: 13,
        opacity: disabled ? 0.52 : pressed ? 0.9 : 1,
        shadowColor: palette.shadowColor,
        shadowOpacity: palette.shadowOpacity,
        shadowRadius: tone === "primary" ? 16 : 10,
        shadowOffset: { width: 0, height: tone === "primary" ? 10 : 4 },
        elevation: palette.elevation,
        transform: [{ scale: pressed ? 0.995 : 1 }],
        ...style,
      })}
    >
      <Text
        style={{
          color: palette.textColor,
          fontSize: 14,
          fontWeight: "800",
          letterSpacing: 0.15,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
