import { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { adminUi } from "@/theme/admin-ui";

type QuickLinkCardProps = {
  label: string;
  description: string;
  icon: ReactNode;
  badge?: string;
  onPress?: () => void;
  disabled?: boolean;
};

export function QuickLinkCard({
  label,
  description,
  icon,
  badge,
  onPress,
  disabled = false,
}: QuickLinkCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        borderRadius: adminUi.radius.card,
        borderWidth: 1,
        borderColor: adminUi.colors.lineSoft,
        backgroundColor: disabled ? adminUi.colors.surfaceAlt : "#ffffff",
        paddingHorizontal: 14,
        paddingVertical: 14,
        gap: 12,
        opacity: disabled ? 0.65 : 1,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 16,
            backgroundColor: adminUi.tones.blue.soft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </View>
        {badge ? (
          <View
            style={{
              borderRadius: 999,
              backgroundColor: adminUi.colors.surfaceAlt,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <Text selectable style={{ color: adminUi.colors.textMuted, fontSize: 10, fontWeight: "800" }}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ gap: 4 }}>
        <Text selectable style={{ color: adminUi.colors.textStrong, fontSize: 15, fontWeight: "900" }}>
          {label}
        </Text>
        <Text selectable style={{ color: adminUi.colors.textMuted, fontSize: 13, lineHeight: 18, maxWidth: "95%" }}>
          {description}
        </Text>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text selectable style={{ color: disabled ? adminUi.colors.textFaint : adminUi.colors.accent, fontSize: 12, fontWeight: "800" }}>
          Buka
        </Text>
        <MaterialIcons name="arrow-forward" size={18} color={disabled ? adminUi.colors.textFaint : adminUi.colors.accent} />
      </View>
    </Pressable>
  );
}
