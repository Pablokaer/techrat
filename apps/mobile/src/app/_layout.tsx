import { useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@techrat/theme";
import { ApiProvider } from "@/lib/api-context";
import { AuthProvider, useAuth } from "@/lib/auth";
import { createQueryClient } from "@/lib/query-client";
import { session } from "@/lib/session";
import { LoadingState } from "@/components/ui";

async function handleUnauthorized() {
  if (!(await session.refresh())) await session.logout();
}

export default function RootLayout() {
  const [queryClient] = useState(() => createQueryClient(handleUnauthorized));
  return (
    <SafeAreaProvider style={{ backgroundColor: colors.background }}>
      <QueryClientProvider client={queryClient}>
        <ApiProvider client={session.api}>
          <AuthProvider session={session}>
            <StatusBar style="light" />
            <RootNavigator />
          </AuthProvider>
        </ApiProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { status } = useAuth();
  if (status === "restoring") return <LoadingState label="Restoring your session" />;
  const signedIn = status === "signedIn";
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="topic/[slug]" options={{ title: "Topic" }} />
        <Stack.Screen name="roadmap/[slug]" options={{ title: "Roadmap" }} />
        <Stack.Screen name="session/[id]" options={{ title: "Practice" }} />
        <Stack.Screen name="leaderboard" options={{ title: "Leaderboard" }} />
        <Stack.Screen name="avatar-crop" options={{ title: "Adjust photo", presentation: "modal" }} />
        <Stack.Screen name="change-password" options={{ title: "Password" }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ title: "Create account" }} />
      </Stack.Protected>
    </Stack>
  );
}
