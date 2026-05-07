import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSessionStore } from "@/stores/session-store";
import { useAppTheme } from "@/theme";

export default function IndexScreen() {
  const theme = useAppTheme();
  const hydrated = useSessionStore((state) => state.hydrated);
  const role = useSessionStore((state) => state.role);

  if (!hydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (role === "admin") {
    return <Redirect href="/(admin)/(tabs)" />;
  }

  if (role === "customer") {
    return <Redirect href="/(customer)/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
