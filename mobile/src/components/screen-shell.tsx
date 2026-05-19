import { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { adminUi } from "@/theme/admin-ui";
import { BookinajaSignal } from "@/components/bookinaja-signal";

type ScreenShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  includeBottomSafeArea?: boolean;
  bottomDockInset?: number;
};

export function ScreenShell({
  eyebrow,
  title,
  description,
  children,
  includeBottomSafeArea = true,
  bottomDockInset = 0,
}: ScreenShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: adminUi.colors.page }}
      edges={includeBottomSafeArea ? ["top", "right", "bottom", "left"] : ["top", "right", "left"]}
    >
      <View style={{ flex: 1 }}>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -84,
            right: -56,
            width: 208,
            height: 208,
            borderRadius: 999,
            backgroundColor: adminUi.colors.glowPrimary,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 78,
            left: -88,
            width: 168,
            height: 168,
            borderRadius: 999,
            backgroundColor: adminUi.colors.glowSecondary,
          }}
        />
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            paddingHorizontal: adminUi.spacing.pageX,
            paddingTop: 8,
            paddingBottom: (includeBottomSafeArea ? Math.max(insets.bottom, 12) : 0) + bottomDockInset + 22,
            gap: adminUi.spacing.section,
          }}
        >
          <Animated.View entering={FadeIn.duration(320)}>
            <View
              style={{
                gap: 6,
                borderRadius: adminUi.radius.cardLarge,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.88)",
                backgroundColor: adminUi.colors.surfaceSoft,
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
            >
              <View style={{ position: "absolute", top: 14, right: 16, opacity: 0.96 }}>
                <BookinajaSignal size={40} tone="soft" />
              </View>
              {eyebrow ? (
                <Text
                  selectable
                  style={{
                    color: adminUi.colors.accent,
                    fontSize: 10,
                    fontWeight: "800",
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                  }}
                >
                  {eyebrow}
                </Text>
              ) : null}

              <Text
                selectable
                style={{
                  color: adminUi.colors.textStrong,
                  fontSize: 24,
                  fontWeight: "900",
                  letterSpacing: -0.8,
                  lineHeight: 28,
                }}
              >
                {title}
              </Text>

              {description ? (
                <Text
                  selectable
                  style={{
                    color: adminUi.colors.textMuted,
                    fontSize: 13,
                    lineHeight: 19,
                    maxWidth: "94%",
                  }}
                >
                  {description}
                </Text>
              ) : null}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(60).duration(360)} style={{ gap: adminUi.spacing.stack }}>
            {children}
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
