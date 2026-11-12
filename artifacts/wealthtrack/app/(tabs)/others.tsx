import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { ProFinancierHeader } from "@/components/ProFinancierHeader";
import { ReminderSettings } from "@/components/ReminderSettings";
import { TrackingSettings } from "@/components/TrackingSettings";
import { Card } from "@/components/UI";
import { useColors } from "@/hooks/useColors";
export default function Others() {
  const c = useColors();
  const rows = [
    ["Goals", "target", "goals"],
    ["Bill split", "users", "billsplit"],
    ["Debts & credits", "repeat", "debts"],
    ["Loans", "credit-card", "loans"],
    ["Insights & budgets", "bar-chart-2", "insights"],
    ["Profile & backup", "user", "profile"],
  ] as const;
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ProFinancierHeader title="Others" />
      <ScrollView
        contentContainerStyle={{ padding: 18, paddingBottom: 140, gap: 14 }}
      >
        {rows.map(([name, icon, route]) => (
          <Pressable
            key={route}
            accessibilityRole="button"
            accessibilityLabel={name}
            onPress={() => router.push(("/(tabs)/" + route) as Href)}
          >
            <Card>
              <View
                style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
              >
                <Feather name={icon} size={20} color={c.foreground} />
                <Text
                  style={{
                    color: c.foreground,
                    fontFamily: "Inter_600SemiBold",
                    flex: 1,
                  }}
                >
                  {name}
                </Text>
                <Feather
                  name="chevron-right"
                  size={17}
                  color={c.mutedForeground}
                />
              </View>
            </Card>
          </Pressable>
        ))}
        <Card>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                color: c.foreground,
                fontSize: 17,
                fontFamily: "Inter_600SemiBold",
              }}
            >
              SMS & payment alerts
            </Text>
            <TrackingSettings />
          </View>
        </Card>
        <ReminderSettings />
      </ScrollView>
    </View>
  );
}
