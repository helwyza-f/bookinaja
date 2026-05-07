import { Pressable, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { ScreenShell } from "@/components/screen-shell";
import { InfoCard } from "@/components/info-card";
import { useSessionStore } from "@/stores/session-store";
import { useAppTheme } from "@/theme";

export default function AdminMoreScreen() {
  const theme = useAppTheme();
  const signOut = useSessionStore((state) => state.signOut);

  return (
    <ScreenShell
      eyebrow="Admin Ops"
      title="More"
      subtitle="Area ini akan menampung billing status, settings lite, dan entry utilitas operasional lain."
    >
      <InfoCard
        label="Billing"
        value="Web-first"
        hint="Subscription management tetap dominan di web; app hanya menampilkan status dan CTA."
      />

      <Pressable
        onPress={() => {
          void signOut();
          router.replace("/(auth)/login");
        }}
        style={[
          styles.button,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
        ]}
      >
        <Text style={[styles.buttonTextDark, { color: theme.colors.foreground }]}>Keluar</Text>
      </Pressable>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonTextDark: {
    fontSize: 16,
    fontWeight: "700",
  },
});
