import "react-native-reanimated";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppProvider } from "@/providers/app-provider";

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="register" />
        <Stack.Screen name="discovery/index" />
        <Stack.Screen name="tenant/[slug]" />
        <Stack.Screen name="admin/login" />
        <Stack.Screen name="admin/(tabs)" />
        <Stack.Screen name="user/login" />
        <Stack.Screen name="user/google-claim" />
        <Stack.Screen name="user/register" />
        <Stack.Screen name="user/me/(tabs)" />
      </Stack>
    </AppProvider>
  );
}
