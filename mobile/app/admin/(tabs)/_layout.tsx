import { Redirect, Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "@/providers/session-provider";
import { adminUi } from "@/theme/admin-ui";
import { BookinajaSignal } from "@/components/bookinaja-signal";

function TabIcon({
  name,
  color,
  size,
  focused,
}: {
  name: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  size: number;
  focused: boolean;
}) {
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? adminUi.tones.blue.soft : "transparent",
        borderWidth: focused ? 1 : 0,
        borderColor: focused ? adminUi.tones.blue.border : "transparent",
      }}
    >
      {focused ? (
        <View style={{ position: "absolute", top: -3, right: -3 }}>
          <BookinajaSignal size={11} tone="blue" />
        </View>
      ) : null}
      <MaterialCommunityIcons name={name} size={size} color={color} />
    </View>
  );
}

export default function AdminTabsLayout() {
  const session = useSession();
  const insets = useSafeAreaInsets();
  const tabBarBottomPadding = Math.max(insets.bottom, 10);

  if (session.isReady && !session.adminToken) {
    return <Redirect href="/admin/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: adminUi.colors.accent,
        tabBarInactiveTintColor: adminUi.colors.textFaint,
        tabBarHideOnKeyboard: true,
        sceneStyle: {
          backgroundColor: adminUi.colors.page,
        },
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: adminUi.layout.floatingTabBottom,
          height: adminUi.layout.floatingTabHeight + tabBarBottomPadding,
          paddingTop: 10,
          paddingBottom: tabBarBottomPadding,
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.72)",
          borderRadius: 30,
          backgroundColor: "rgba(255,255,255,0.88)",
          elevation: 0,
          shadowColor: adminUi.colors.shadow,
          shadowOpacity: 0.09,
          shadowRadius: 26,
          shadowOffset: { width: 0, height: 14 },
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "800",
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingTop: 2,
          paddingBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size, focused }) => <TabIcon name="view-dashboard-outline" size={size} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color, size, focused }) => <TabIcon name="calendar-month-outline" size={size} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="operations"
        options={{
          title: "Ops",
          tabBarIcon: ({ color, size, focused }) => <TabIcon name="lightning-bolt-outline" size={size} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: "Customers",
          tabBarIcon: ({ color, size, focused }) => <TabIcon name="account-group-outline" size={size} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="workspace"
        options={{
          title: "Workspace",
          tabBarIcon: ({ color, size, focused }) => <TabIcon name="briefcase-outline" size={size} color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
