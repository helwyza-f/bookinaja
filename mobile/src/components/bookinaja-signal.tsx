import { View } from "react-native";
import { adminUi } from "@/theme/admin-ui";

export function BookinajaSignal({
  size = 42,
  tone = "blue",
}: {
  size?: number;
  tone?: "blue" | "dark" | "soft";
}) {
  const palette =
    tone === "dark"
      ? {
          ring: "#0f172a",
          line: "rgba(255,255,255,0.58)",
          bg: "#0f172a",
        }
      : tone === "soft"
        ? {
            ring: adminUi.colors.accent,
            line: "rgba(36,87,230,0.18)",
            bg: "#ffffff",
          }
        : {
            ring: adminUi.colors.accentStrong,
            line: "rgba(255,255,255,0.48)",
            bg: adminUi.colors.accentStrong,
          };

  const ringSizes = [1, 0.72, 0.44];

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: palette.bg,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {ringSizes.map((multiplier, index) => (
        <View
          key={multiplier}
          style={{
            position: "absolute",
            width: size * multiplier,
            height: size * multiplier,
            borderRadius: 999,
            borderWidth: index === ringSizes.length - 1 ? 3 : 2.5,
            borderColor: palette.line,
          }}
        />
      ))}

      <View
        style={{
          position: "absolute",
          width: size * 0.12,
          top: 0,
          bottom: 0,
          backgroundColor: palette.line,
        }}
      />
      <View
        style={{
          position: "absolute",
          height: size * 0.12,
          left: 0,
          right: 0,
          backgroundColor: palette.line,
        }}
      />
      <View
        style={{
          width: size * 0.18,
          height: size * 0.18,
          borderRadius: 999,
          backgroundColor: "#ffffff",
        }}
      />
    </View>
  );
}
