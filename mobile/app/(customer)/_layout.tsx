import { Redirect, Stack } from "expo-router";
import { useSessionStore } from "@/stores/session-store";

export default function CustomerLayout() {
  const hydrated = useSessionStore((state) => state.hydrated);
  const role = useSessionStore((state) => state.role);

  if (hydrated && role === "guest") {
    return <Redirect href="/(auth)/login" />;
  }

  if (hydrated && role === "admin") {
    return <Redirect href="/(admin)/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="tenant/[slug]" />
      <Stack.Screen name="resource/[id]" />
      <Stack.Screen name="bookings/[id]" />
      <Stack.Screen name="bookings/[id]/live" />
      <Stack.Screen name="bookings/[id]/payment" />
    </Stack>
  );
}
