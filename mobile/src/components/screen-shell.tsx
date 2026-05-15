import { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";

type ScreenShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function ScreenShell({
  eyebrow,
  title,
  description,
  children,
}: ScreenShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f3f6fb" }} edges={["top", "right", "bottom", "left"]}>
      <View style={{ flex: 1 }}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            paddingHorizontal: 18,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 12) + 24,
            gap: 16,
          }}
        >
          <Animated.View entering={FadeIn.duration(320)}>
            <View
              style={{
                gap: 6,
              }}
            >
              {eyebrow ? (
                <Text
                  selectable
                  style={{
                    color: "#2563eb",
                    fontSize: 10,
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
                  color: "#0f172a",
                  fontSize: 24,
                  fontWeight: "900",
                  letterSpacing: -0.6,
                  lineHeight: 28,
                }}
              >
                {title}
              </Text>

              {description ? (
                <Text
                  selectable
                  style={{
                    color: "#475569",
                    fontSize: 14,
                    lineHeight: 20,
                    maxWidth: "96%",
                  }}
                >
                  {description}
                </Text>
              ) : null}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(60).duration(360)} style={{ gap: 12 }}>
            {children}
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
