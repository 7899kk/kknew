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
    { name: "index", title: "Home", icon: "home" },
    { name: "activity", title: "Activity", icon: "file-text" },
    { name: "expenses", title: "Add", icon: "plus" },
    { name: "insights", title: "Insights", icon: "bar-chart-2" },
    { name: "loans", title: "Loans", icon: "credit-card" },
    { name: "others", title: "Others", icon: "grid" },
  ];
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.foreground,
        tabBarInactiveTintColor: c.mutedForeground,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: c.card,
          borderTopWidth: 0,
          height: Platform.OS === "web" ? 76 : 64 + insets.bottom,
          paddingBottom: Platform.OS === "web" ? 16 : 8 + insets.bottom,
          paddingTop: 7,
        },
        tabBarLabelStyle: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
      }}
    >
      {items.map((item) => (
        <Tabs.Screen
          key={item.name}
          name={item.name}
          listeners={
            item.name === "expenses"
              ? {
                  tabPress: (e) => {
                    e.preventDefault();
                    router.navigate({
                      pathname: "/(tabs)/expenses",
                      params: { compose: String(Date.now()) },
                    } as Href);
                  },
                }
              : undefined
          }
          options={{
            title: item.title,
            tabBarIcon: ({ color }) =>
              item.name === "expenses" ? (
                <View
                  style={{
                    height: 43,
                    width: 43,
                    borderRadius: 23,
                    backgroundColor: c.gold,
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: -14,
                    borderWidth: 5,
                    borderColor: c.background,
                  }}
                >
                  <Feather name="plus" size={21} color={c.foreground} />
                </View>
              ) : (
                <Feather name={item.icon} size={19} color={color} />
              ),
          }}
        />
      ))}
      {["debts", "goals", "billsplit", "profile"].map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
