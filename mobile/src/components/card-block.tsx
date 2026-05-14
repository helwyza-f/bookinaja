import { ReactNode } from "react";
import { View } from "react-native";

export function CardBlock({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        borderRadius: 28,
        borderWidth: 1,
        borderColor: "#dbeafe",
        backgroundColor: "#ffffff",
        padding: 18,
        gap: 14,
      }}
    >
      {children}
    </View>
  );
}
