import { useState } from "react";
import { Text, TextInput, TextInputProps, View } from "react-native";
import { adminUi } from "@/theme/admin-ui";

type FieldProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
};

export function Field({
  label,
  hint,
  error,
  style,
  multiline,
  ...props
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? adminUi.tones.danger.border : focused ? adminUi.colors.accent : adminUi.colors.line;

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <Text
          style={{
            color: adminUi.colors.textBase,
            fontSize: 12,
            fontWeight: "700",
          }}
        >
          {label}
        </Text>
        {hint ? (
          <Text style={{ color: adminUi.colors.textMuted, fontSize: 12 }}>
            {hint}
          </Text>
        ) : null}
      </View>

      <TextInput
        placeholderTextColor="#94a3b8"
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        multiline={multiline}
        style={[
          {
            minHeight: multiline ? 110 : 54,
            borderRadius: adminUi.radius.control,
            borderWidth: 1,
            borderColor,
            backgroundColor: adminUi.colors.surfaceMuted,
            paddingHorizontal: 15,
            paddingTop: multiline ? 15 : 0,
            paddingBottom: multiline ? 15 : 0,
            fontSize: 15,
            color: adminUi.colors.textStrong,
            shadowColor: focused ? adminUi.colors.accent : adminUi.colors.shadow,
            shadowOpacity: focused ? 0.08 : 0.02,
            shadowRadius: focused ? 10 : 6,
            shadowOffset: { width: 0, height: focused ? 4 : 2 },
            elevation: focused ? 1 : 0,
          },
          style,
        ]}
        {...props}
      />

      {error ? (
        <Text style={{ color: adminUi.tones.danger.text, fontSize: 12, lineHeight: 18 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
