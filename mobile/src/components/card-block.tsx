import { ReactNode } from "react";
import { View } from "react-native";

export function CardBlock({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#e6ebf2",
        backgroundColor: "#ffffff",
        padding: 16,
        gap: 12,
        shadowColor: "#0f172a",
        shadowOpacity: 0.025,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 1,
      }}
    >
      {children}
    </View>
  );
}
