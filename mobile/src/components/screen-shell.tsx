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
            top: -96,
            right: -48,
            width: 224,
            height: 224,
            borderRadius: 999,
            backgroundColor: adminUi.colors.glowPrimary,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 92,
            left: -76,
            width: 176,
            height: 176,
            borderRadius: 999,
            backgroundColor: adminUi.colors.glowSecondary,
          }}
        />
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            paddingHorizontal: adminUi.spacing.pageX,
            paddingTop: 12,
            paddingBottom: (includeBottomSafeArea ? Math.max(insets.bottom, 12) : 0) + bottomDockInset + 22,
            gap: adminUi.spacing.section + 4,
          }}
        >
          <Animated.View entering={FadeIn.duration(320)}>
            <View
              style={{
                gap: 8,
                borderRadius: adminUi.radius.cardLarge,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.92)",
                backgroundColor: adminUi.colors.surfaceSoft,
                paddingHorizontal: 20,
                paddingVertical: 18,
                shadowColor: adminUi.colors.shadow,
                shadowOpacity: 0.08,
                shadowRadius: 30,
                shadowOffset: { width: 0, height: 18 },
                elevation: 2,
              }}
            >
              <View style={{ position: "absolute", top: 18, right: 18, opacity: 0.96 }}>
                <BookinajaSignal size={40} tone="soft" />
              </View>
              {eyebrow ? (
                <Text
                  selectable
                  style={{
                    color: adminUi.colors.accent,
                    fontSize: 11,
                    fontWeight: "800",
                    letterSpacing: 1.8,
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
                  fontSize: 28,
                  fontWeight: "900",
                  letterSpacing: -0.9,
                  lineHeight: 36,
                  maxWidth: "84%",
                }}
              >
                {title}
              </Text>

              {description ? (
                <Text
                  selectable
                  style={{
                    color: adminUi.colors.textMuted,
                    fontSize: 16,
                    lineHeight: 24,
                    maxWidth: "92%",
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
