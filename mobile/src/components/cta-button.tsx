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
        borderRadius: 20,
        backgroundColor: tone === "primary" ? "#1d4ed8" : "#e2e8f0",
        opacity: disabled ? 0.55 : 1,
        paddingHorizontal: 18,
        paddingVertical: 14,
      }}
    >
      <Text
        selectable
        style={{
          color: tone === "primary" ? "#ffffff" : "#0f172a",
          fontSize: 15,
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
