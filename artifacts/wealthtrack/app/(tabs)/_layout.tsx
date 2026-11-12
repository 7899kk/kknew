import React from "react";
import { Tabs, router, type Href } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
export default function TabLayout() {
  const c = useColors(),
    insets = useSafeAreaInsets();
  const items: {
    name: string;
    title: string;
    icon: React.ComponentProps<typeof Feather>["name"];
  }[] = [
    { name: "index", title: "Dashboard", icon: "home" },
    { name: "expenses", title: "Expenses", icon: "credit-card" },
    { name: "activity", title: "Activity", icon: "list" },
    { name: "debts", title: "Dues", icon: "repeat" },
    { name: "goals", title: "Goals", icon: "target" },
    { name: "billsplit", title: "Split", icon: "users" },
    { name: "profile", title: "Profile", icon: "user" },
  ];
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.mutedForeground,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: c.background,
          borderTopWidth: 1,
          borderTopColor: c.border,
          height: Platform.OS === "web" ? 76 : 64 + insets.bottom,
          paddingBottom: Platform.OS === "web" ? 16 : 8 + insets.bottom,
          paddingTop: 7,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          marginHorizontal: 0,
          fontFamily: "Inter_600SemiBold",
        },
      }}
    >
      {items.map((item) => (
        <Tabs.Screen
          key={item.name}
          name={item.name}
          options={{
            title: item.title,
            tabBarIcon: ({ color }) => (
              <Feather name={item.icon} size={20} color={color} />
            ),
          }}
        />
      ))}
      {["loans", "others", "insights"].map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
