import { Stack } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppToastHost } from "@/components/app-toast-host";
import { AppThemeProvider, useAppTheme } from "@/theme";
import { AppQueryProvider } from "@/lib/query/provider";
import { useSessionStore } from "@/stores/session-store";

function SessionBootstrap({ children }: { children: React.ReactNode }) {
  const hydrated = useSessionStore((state) => state.hydrated);
  const hydrate = useSessionStore((state) => state.hydrate);

  useEffect(() => {
    if (!hydrated) {
      void hydrate();
    }
  }, [hydrate, hydrated]);

  return <>{children}</>;
}

function RootNavigator() {
  const theme = useAppTheme();

  return (
    <>
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppThemeProvider>
          <AppQueryProvider>
            <SessionBootstrap>
              <RootNavigator />
              <AppToastHost />
            </SessionBootstrap>
          </AppQueryProvider>
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
