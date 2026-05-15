import { Pressable, Text } from "react-native";

type CtaButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  tone?: "primary" | "secondary";
};

export function CtaButton({
  label,
  onPress,
  disabled,
  tone = "primary",
}: CtaButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        minHeight: 48,
        justifyContent: "center",
        borderRadius: 16,
        backgroundColor: tone === "primary" ? "#2952d9" : "#eef2f7",
        opacity: disabled ? 0.55 : 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        shadowColor: tone === "primary" ? "#2952d9" : "#0f172a",
        shadowOpacity: tone === "primary" ? 0.1 : 0.025,
        shadowRadius: tone === "primary" ? 8 : 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: tone === "primary" ? 2 : 1,
      }}
    >
      <Text
        selectable
        style={{
          color: tone === "primary" ? "#ffffff" : "#0f172a",
          fontSize: 14,
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
