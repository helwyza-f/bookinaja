import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { adminUi } from "@/theme/admin-ui";
import { CardBlock } from "@/components/card-block";
import { BookinajaSignal } from "@/components/bookinaja-signal";

export function PatternDashboardCard({
  title,
  description,
  badge,
  children,
}: {
  title: string;
  description: string;
  badge?: string;
  children?: ReactNode;
}) {
  return (
    <CardBlock>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: adminUi.colors.textStrong, fontSize: 18, fontWeight: "900" }}>
            {title}
          </Text>
          <Text style={{ color: adminUi.colors.textMuted, fontSize: 13, lineHeight: 19 }}>
            {description}
          </Text>
        </View>
        {badge ? (
          <View
            style={{
              borderRadius: adminUi.radius.chip,
              backgroundColor: adminUi.tones.blue.soft,
              borderWidth: 1,
              borderColor: adminUi.tones.blue.border,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <Text style={{ color: adminUi.tones.blue.text, fontSize: 11, fontWeight: "800" }}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      {children}
    </CardBlock>
  );
}

export function PatternListCard({
  title,
  subtitle,
  meta,
  trailing,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  trailing?: ReactNode;
}) {
  return (
    <CardBlock>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: adminUi.colors.textStrong, fontSize: 15, fontWeight: "800" }}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ color: adminUi.colors.textMuted, fontSize: 13 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {trailing}
      </View>
      {meta ? (
        <Text style={{ color: adminUi.colors.textMuted, fontSize: 12, lineHeight: 18 }}>
          {meta}
        </Text>
      ) : null}
    </CardBlock>
  );
}

export function PatternDetailHero({
  title,
  description,
  status,
}: {
  title: string;
  description: string;
  status?: ReactNode;
}) {
  return (
    <View
      style={{
        borderRadius: adminUi.radius.card,
        borderWidth: 1,
        borderColor: adminUi.tones.blue.border,
        backgroundColor: adminUi.tones.blue.soft,
        paddingHorizontal: 15,
        paddingVertical: 15,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: adminUi.colors.textStrong, fontSize: 18, fontWeight: "900" }}>
            {title}
          </Text>
          <Text style={{ color: adminUi.colors.textMuted, fontSize: 13, lineHeight: 19 }}>
            {description}
          </Text>
        </View>
        <BookinajaSignal size={36} tone="soft" />
      </View>
      {status}
    </View>
  );
}

export function PatternFormCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <CardBlock>
      <View style={{ gap: 4 }}>
        <Text style={{ color: adminUi.colors.textStrong, fontSize: 16, fontWeight: "900" }}>
          {title}
        </Text>
        {description ? (
          <Text style={{ color: adminUi.colors.textMuted, fontSize: 13, lineHeight: 19 }}>
            {description}
          </Text>
        ) : null}
      </View>
      {children}
    </CardBlock>
  );
}

export function PatternSheetHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <BookinajaSignal size={26} tone="soft" />
        <Text style={{ color: adminUi.colors.textStrong, fontSize: 20, fontWeight: "900" }}>
          {title}
        </Text>
      </View>
      {description ? (
        <Text style={{ color: adminUi.colors.textMuted, fontSize: 13, lineHeight: 19 }}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

export function PatternActionBar({
  label,
  hint,
  icon,
}: {
  label: string;
  hint?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}) {
  return (
    <View
      style={{
        borderRadius: adminUi.radius.control,
        borderWidth: 1,
        borderColor: adminUi.colors.lineSoft,
        backgroundColor: adminUi.colors.surfaceAlt,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      {icon ? (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 14,
            backgroundColor: adminUi.tones.blue.soft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons name={icon} size={18} color={adminUi.colors.accent} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: adminUi.colors.textStrong, fontSize: 14, fontWeight: "800" }}>
          {label}
        </Text>
        {hint ? (
          <Text style={{ color: adminUi.colors.textMuted, fontSize: 12 }}>
            {hint}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
