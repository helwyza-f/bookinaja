import { Redirect, Tabs } from "expo-router";
import { useSession } from "@/providers/session-provider";

export default function AdminTabsLayout() {
  const session = useSession();

  if (session.isReady && !session.adminToken) {
    return <Redirect href="/admin/login" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#1d4ed8" }}>
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="bookings" options={{ title: "Bookings" }} />
      <Tabs.Screen name="customers" options={{ title: "Customers" }} />
      <Tabs.Screen name="more" options={{ title: "More" }} />
    </Tabs>
  );
}
