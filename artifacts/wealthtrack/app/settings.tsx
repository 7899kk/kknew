import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProFinancierHeader } from "@/components/ProFinancierHeader";
import { Card } from "@/components/UI";
import { useColors } from "@/hooks/useColors";
export default function Settings() {
  const c = useColors(),
    insets = useSafeAreaInsets();
  const rows: {
    title: string;
    icon: React.ComponentProps<typeof Feather>["name"];
    route: string;
  }[] = [
    { title: "Reminders & more", icon: "bell", route: "/(tabs)/others" },
    { title: "Profile", icon: "user", route: "/(tabs)/profile" },
    { title: "Debts & credits", icon: "repeat", route: "/(tabs)/debts" },
    { title: "Goals", icon: "target", route: "/(tabs)/goals" },
    { title: "Bill split", icon: "users", route: "/(tabs)/billsplit" },
    { title: "Loans", icon: "credit-card", route: "/(tabs)/loans" },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ProFinancierHeader title="Settings" />
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 32,
          gap: 12,
        }}
      >
        {rows.map((row) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={row.title}
            key={row.title}
            onPress={() => router.push(row.route as Href)}
          >
            <Card>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 13,
                    backgroundColor: c.goldLight,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name={row.icon} size={19} color={c.foreground} />
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontFamily: "Inter_600SemiBold",
                    color: c.foreground,
                  }}
                >
                  {row.title}
                </Text>
                <Feather
                  name="chevron-right"
                  size={18}
                  color={c.mutedForeground}
                />
              </View>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
