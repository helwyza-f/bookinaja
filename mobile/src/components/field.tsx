import { Text, TextInput, TextInputProps, View } from "react-native";

type FieldProps = TextInputProps & {
  label: string;
  hint?: string;
};

export function Field({ label, hint, ...props }: FieldProps) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <Text
          selectable
          style={{
            color: "#334155",
            fontSize: 11,
            fontWeight: "800",
            letterSpacing: 1.2,
            textTransform: "uppercase",
          }}
        >
          {label}
        </Text>
        {hint ? (
          <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
            {hint}
          </Text>
        ) : null}
      </View>
      <TextInput
        placeholderTextColor="#94a3b8"
        style={{
          borderRadius: 18,
          borderWidth: 1,
          borderColor: "#d6deea",
          backgroundColor: "#fbfdff",
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 15,
          color: "#0f172a",
        }}
        {...props}
      />
    </View>
  );
}
