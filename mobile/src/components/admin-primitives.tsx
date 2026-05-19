import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { adminUi } from "@/theme/admin-ui";
import { BookinajaSignal } from "@/components/bookinaja-signal";

type Tone = "blue" | "success" | "amber" | "danger" | "slate" | "violet";

const toneMap = {
  blue: adminUi.tones.blue,
  success: adminUi.tones.success,
  amber: adminUi.tones.amber,
  danger: adminUi.tones.danger,
  slate: adminUi.tones.slate,
  violet: adminUi.tones.violet,
} as const;

export function SectionHeader({
  title,
  description,
  actionLabel,
  onAction,
  icon = "star-four-points-circle-outline",
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 11,
              backgroundColor: adminUi.tones.blue.soft,
              borderWidth: 1,
              borderColor: adminUi.tones.blue.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons name={icon} size={14} color={adminUi.colors.accent} />
          </View>
          <Text selectable style={{ color: adminUi.colors.textStrong, fontSize: 16, fontWeight: "900" }}>
            {title}
          </Text>
        </View>
        {description ? (
          <Text selectable style={{ color: adminUi.colors.textMuted, fontSize: 13, lineHeight: 19 }}>
            {description}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={{ paddingTop: 2 }}>
          <Text selectable style={{ color: adminUi.colors.accent, fontSize: 12, fontWeight: "800" }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: Tone;
}) {
  const colors = toneMap[tone];
  return (
    <View
      style={{
        borderRadius: adminUi.radius.chip,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.soft,
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Text selectable style={{ color: colors.text, fontSize: 11, fontWeight: "800" }}>
        {label}
      </Text>
    </View>
  );
}

export function HeroPanel({
  eyebrow,
  title,
  description,
  tone = "blue",
  icon = "lightning-bolt-circle",
}: {
  eyebrow?: string;
  title: string;
  description: string;
  tone?: "blue" | "success" | "amber" | "slate" | "violet";
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}) {
  const palette = toneMap[tone];

  return (
    <View
      style={{
        borderRadius: adminUi.radius.card,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.soft,
        paddingHorizontal: 15,
        paddingVertical: 15,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 14,
            backgroundColor: "#ffffff",
            borderWidth: 1,
            borderColor: palette.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons name={icon} size={20} color={palette.text} />
        </View>
        <BookinajaSignal size={24} tone="soft" />
      </View>
      {eyebrow ? (
        <Text selectable style={{ color: palette.text, fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
          {eyebrow.toUpperCase()}
        </Text>
      ) : null}
      <Text selectable style={{ color: adminUi.colors.textStrong, fontSize: 18, fontWeight: "900" }}>
        {title}
      </Text>
      <Text selectable style={{ color: adminUi.colors.textMuted, fontSize: 13, lineHeight: 19 }}>
        {description}
      </Text>
    </View>
  );
}

export function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: adminUi.radius.chip,
        borderWidth: 1,
        borderColor: active ? adminUi.tones.blue.border : adminUi.colors.line,
        backgroundColor: active ? adminUi.tones.blue.soft : "#ffffff",
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <Text selectable style={{ color: active ? adminUi.tones.blue.text : adminUi.colors.textMuted, fontSize: 12, fontWeight: "800" }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function EmptyStateCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View
      style={{
        borderRadius: adminUi.radius.control,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: adminUi.colors.line,
        backgroundColor: adminUi.colors.surfaceMuted,
        paddingHorizontal: 15,
        paddingVertical: 16,
        gap: 4,
      }}
    >
      <Text selectable style={{ color: adminUi.colors.textStrong, fontSize: 14, fontWeight: "800" }}>
        {title}
      </Text>
      <Text selectable style={{ color: adminUi.colors.textMuted, fontSize: 13, lineHeight: 19 }}>
        {description}
      </Text>
    </View>
  );
}

export function SummaryPair({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: adminUi.radius.control,
        backgroundColor: adminUi.colors.surfaceAlt,
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 4,
      }}
    >
      <Text selectable style={{ color: adminUi.colors.textFaint, fontSize: 10, fontWeight: "800", letterSpacing: 0.9 }}>
        {label.toUpperCase()}
      </Text>
      <Text selectable style={{ color: accent ? adminUi.colors.accent : adminUi.colors.textStrong, fontSize: 14, fontWeight: "900" }}>
        {value}
      </Text>
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  meta,
  badge,
  onPress,
  icon = "dots-grid",
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: ReactNode;
  onPress?: () => void;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}) {
  const body = (
    <>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, flexDirection: "row", gap: 10 }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 13,
              backgroundColor: adminUi.tones.blue.soft,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 1,
            }}
          >
            <MaterialCommunityIcons name={icon} size={16} color={adminUi.colors.accent} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text selectable style={{ color: adminUi.colors.textStrong, fontSize: 15, fontWeight: "800" }}>
              {title}
            </Text>
            {subtitle ? (
              <Text selectable style={{ color: adminUi.colors.textMuted, fontSize: 13 }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        {badge}
      </View>
      {meta ? (
        <Text selectable style={{ color: adminUi.colors.textMuted, fontSize: 12, lineHeight: 18, marginLeft: 44 }}>
          {meta}
        </Text>
      ) : null}
    </>
  );

  const style = {
    borderRadius: adminUi.radius.control,
    borderWidth: 1,
    borderColor: adminUi.colors.lineSoft,
    backgroundColor: adminUi.colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  } as const;

  if (onPress) {
    return <Pressable onPress={onPress} style={style}>{body}</Pressable>;
  }

  return <View style={style}>{body}</View>;
}

export function Keyline({
  icon,
  title,
  description,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          backgroundColor: adminUi.tones.blue.soft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialCommunityIcons name={icon} size={18} color={adminUi.colors.accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text selectable style={{ color: adminUi.colors.textStrong, fontSize: 14, fontWeight: "800" }}>
          {title}
        </Text>
        <Text selectable style={{ color: adminUi.colors.textMuted, fontSize: 12, lineHeight: 18 }}>
          {description}
        </Text>
      </View>
    </View>
  );
}
