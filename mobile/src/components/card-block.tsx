import { ReactNode } from "react";
import { View } from "react-native";
import { adminUi } from "@/theme/admin-ui";

export function CardBlock({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        borderRadius: adminUi.radius.card,
        borderWidth: 1,
        borderColor: adminUi.colors.line,
        backgroundColor: "rgba(255,255,255,0.97)",
        padding: adminUi.spacing.card,
        gap: adminUi.spacing.stack,
        shadowColor: adminUi.colors.shadow,
        shadowOpacity: 0.045,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 1,
      }}
    >
      {children}
    </View>
  );
}
