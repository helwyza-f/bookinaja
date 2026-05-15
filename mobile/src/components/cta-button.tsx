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
        shadowOpacity: 0,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 0 },
        elevation: 0,
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
