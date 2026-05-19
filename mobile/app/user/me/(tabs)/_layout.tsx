import { Redirect, Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "@/providers/session-provider";

export default function CustomerTabsLayout() {
  const session = useSession();
  const insets = useSafeAreaInsets();
  const compactBarHeight = 50;
  const tabBarBottomPadding = Math.max(insets.bottom, 10);

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
        sceneStyle: {
          backgroundColor: "#f3f6fb",
        },
        tabBarStyle: {
          height: compactBarHeight + tabBarBottomPadding,
          paddingTop: 5,
          paddingBottom: tabBarBottomPadding,
          borderTopWidth: 0,
          backgroundColor: "#f3f6fb",
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          marginTop: 0,
        },
        tabBarItemStyle: {
          paddingTop: 1,
          paddingBottom: 0,
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
