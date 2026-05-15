import { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f8ff" }} edges={["top", "left", "right"]}>
      <View style={{ flex: 1 }}>
        <View pointerEvents="none" style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <View
            style={{
              top: -84,
              right: -44,
              width: 210,
              height: 210,
              borderRadius: 999,
              backgroundColor: "#deebff",
            }}
          />
          <View
            style={{
              bottom: 120,
              left: -62,
              width: 176,
              height: 176,
              borderRadius: 44,
              backgroundColor: "rgba(191,219,254,0.34)",
              transform: [{ rotate: "-14deg" }],
            }}
          />
          <View
            style={{
              top: 118,
              right: 10,
              width: 120,
              height: 120,
              borderRadius: 32,
              borderWidth: 1,
              borderColor: "#deebff",
              backgroundColor: "#f8fbff",
              opacity: 0.62,
              transform: [{ rotate: "12deg" }],
            }}
          />
        </View>

        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 42, gap: 16 }}
        >
          <Animated.View entering={FadeIn.duration(320)}>
            <View
              style={{
                marginTop: 8,
                borderRadius: 26,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                backgroundColor: "#fbfdff",
                paddingHorizontal: 18,
                paddingVertical: 16,
                gap: 8,
                shadowColor: "#020617",
                shadowOpacity: 0.045,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
                elevation: 2,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                {eyebrow ? (
                  <Text
                    selectable
                    style={{
                      color: "#2563eb",
                      fontSize: 10,
                      fontWeight: "800",
                      letterSpacing: 2.4,
                      textTransform: "uppercase",
                    }}
                  >
                    {eyebrow}
                  </Text>
                ) : (
                  <View />
                )}
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 999,
                    backgroundColor: "#60a5fa",
                  }}
                />
              </View>

              <Text
                selectable
                style={{
                  color: "#0f172a",
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
                    color: "#64748b",
                    fontSize: 13,
                    lineHeight: 20,
                    maxWidth: "92%",
                  }}
                >
                  {description}
                </Text>
              ) : null}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(60).duration(360)} style={{ gap: 14 }}>
            {children}
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
