import { ReactNode } from "react";
import { View } from "react-native";

export function CardBlock({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        borderRadius: 26,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        backgroundColor: "#ffffff",
        padding: 18,
        gap: 14,
        shadowColor: "#0f172a",
        shadowOpacity: 0.035,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 1,
      }}
    >
      {children}
    </View>
  );
}
