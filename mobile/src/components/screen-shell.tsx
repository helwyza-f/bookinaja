import { ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#eef4ff" }} edges={["top", "left", "right"]}>
      <View style={{ flex: 1 }}>
        <View pointerEvents="none" style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <View
            style={{
              position: "absolute",
              top: -90,
              right: -50,
              width: 220,
              height: 220,
              borderRadius: 999,
              backgroundColor: "#bfdbfe",
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 90,
              left: -70,
              width: 180,
              height: 180,
              borderRadius: 999,
              backgroundColor: "#dbeafe",
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 78,
              right: 24,
              width: 132,
              height: 132,
              borderRadius: 40,
              borderWidth: 1,
              borderColor: "#cfe0ff",
              backgroundColor: "#f8fbff",
              opacity: 0.72,
              transform: [{ rotate: "16deg" }],
            }}
          />
        </View>

        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 42, gap: 16 }}
        >
          <Animated.View entering={FadeIn.duration(320)}>
            <LinearGradient
              colors={["rgba(255,255,255,0.98)", "rgba(248,251,255,0.94)"]}
              style={{
                marginTop: 8,
                borderRadius: 28,
                borderWidth: 1,
                borderColor: "#d7e5ff",
                paddingHorizontal: 18,
                paddingVertical: 16,
                gap: 8,
                shadowColor: "#020617",
                shadowOpacity: 0.08,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 10 },
                elevation: 6,
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
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(60).duration(360)} style={{ gap: 14 }}>
            {children}
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
