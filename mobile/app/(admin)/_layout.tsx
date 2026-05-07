import { Redirect, Stack } from "expo-router";
import { useSessionStore } from "@/stores/session-store";

export default function AdminLayout() {
  const hydrated = useSessionStore((state) => state.hydrated);
  const role = useSessionStore((state) => state.role);

  if (hydrated && role === "guest") {
    return <Redirect href="/(auth)/login" />;
  }

  if (hydrated && role === "customer") {
    return <Redirect href="/(customer)/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
