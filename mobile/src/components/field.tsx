import { Text, TextInput, TextInputProps, View } from "react-native";

type FieldProps = TextInputProps & {
  label: string;
  hint?: string;
};

export function Field({ label, hint, ...props }: FieldProps) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <Text
          selectable
          style={{
            color: "#334155",
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 1,
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
          minHeight: 48,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#d9e2ec",
          backgroundColor: "#f8fafc",
          paddingHorizontal: 14,
          paddingVertical: 0,
          fontSize: 14,
          color: "#0f172a",
        }}
        {...props}
      />
    </View>
  );
}
