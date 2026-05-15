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
        backgroundColor: tone === "primary" ? "#2952d9" : "#eef2f7",
        opacity: disabled ? 0.55 : 1,
        paddingHorizontal: 18,
        paddingVertical: 15,
        shadowColor: tone === "primary" ? "#2952d9" : "#0f172a",
        shadowOpacity: tone === "primary" ? 0.12 : 0.03,
        shadowRadius: tone === "primary" ? 10 : 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: tone === "primary" ? 2 : 1,
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
