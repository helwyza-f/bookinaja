import { Redirect, Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSession } from "@/providers/session-provider";

export default function CustomerTabsLayout() {
  const session = useSession();

  if (session.isReady && !session.customerToken) {
    return <Redirect href="/user/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarShowLabel: true,
        tabBarStyle: {
          height: 78,
          paddingTop: 10,
          paddingBottom: 10,
          borderTopColor: "#dbeafe",
          backgroundColor: "#fbfdff",
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons name={focused ? "home-filled" : "home"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Jelajah",
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons name={focused ? "travel-explore" : "explore"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="active"
        options={{
          title: "Aktif",
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons name="bolt" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons name={focused ? "person" : "person-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
