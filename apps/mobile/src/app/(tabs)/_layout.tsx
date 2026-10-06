import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "@techrat/theme";

type IconName = keyof typeof Ionicons.glyphMap;

const tab = (title: string, icon: IconName, activeIcon: IconName) => ({
  title,
  tabBarAccessibilityLabel: `${title} tab`,
  tabBarIcon: ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <Ionicons name={focused ? activeIcon : icon} color={color} size={size} />
  ),
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={tab("Home", "home-outline", "home")} />
      <Tabs.Screen name="learn" options={tab("Learn", "library-outline", "library")} />
      <Tabs.Screen name="practice" options={tab("Practice", "flash-outline", "flash")} />
      <Tabs.Screen name="roadmaps" options={tab("Roadmaps", "map-outline", "map")} />
      <Tabs.Screen name="profile" options={tab("Profile", "person-outline", "person")} />
    </Tabs>
  );
}
