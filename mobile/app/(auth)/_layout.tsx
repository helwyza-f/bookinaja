import { Redirect, Stack } from "expo-router";
import { useSessionStore } from "@/stores/session-store";

export default function AuthLayout() {
  const hydrated = useSessionStore((state) => state.hydrated);
  const role = useSessionStore((state) => state.role);

  if (hydrated && role === "customer") {
    return <Redirect href="/(customer)/(tabs)" />;
  }

  if (hydrated && role === "admin") {
    return <Redirect href="/(admin)/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
