import { Redirect, Tabs } from "expo-router";
import { useSession } from "@/providers/session-provider";

export default function CustomerTabsLayout() {
  const session = useSession();

  if (session.isReady && !session.customerToken) {
    return <Redirect href="/user/login" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#1d4ed8" }}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="active" options={{ title: "Aktif" }} />
      <Tabs.Screen name="history" options={{ title: "Riwayat" }} />
      <Tabs.Screen name="profile" options={{ title: "Profil" }} />
    </Tabs>
  );
}
