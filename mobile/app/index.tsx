import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSession } from "@/providers/session-provider";

export default function HomeScreen() {
  const session = useSession();

  if (!session.isReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#eff4ff",
        }}
      >
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  if (session.adminToken) {
    return <Redirect href="/admin/dashboard" />;
  }

  if (session.customerToken) {
    return <Redirect href="/user/me" />;
  }

  return <Redirect href="/user/login" />;
}
