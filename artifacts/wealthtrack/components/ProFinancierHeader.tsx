import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
export function ProFinancierHeader({
  title,
  subtitle,
  rightSlot,
  compact,
}: {
  title?: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  compact?: boolean;
}) {
  const c = useColors(),
    insets = useSafeAreaInsets(),
    { profile } = useApp();
  const settings = title === "Settings";
  return (
    <View
      style={{
        backgroundColor: c.background,
        paddingTop: insets.top + 8,
        paddingHorizontal: 20,
        paddingBottom: 12,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
        {settings && (
          <Pressable
            accessibilityLabel="Back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={{ padding: 8 }}
          >
            <Feather name="arrow-left" size={20} color={c.foreground} />
          </Pressable>
        )}
        <Image
          source={require("../assets/images/logo.png")}
          style={{ width: 31, height: 31, borderRadius: 9 }}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_700Bold",
              color: c.foreground,
            }}
          >
            Pro Financier
          </Text>
          <Text
            style={{ fontSize: 11, color: c.mutedForeground, marginTop: 2 }}
          >
            Hi, {profile.name?.split(" ")[0] || "there"}
          </Text>
        </View>
        {rightSlot}
        {!settings && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={() => router.push("/settings" as Href)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: c.card,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="settings" size={18} color={c.foreground} />
          </Pressable>
        )}
      </View>
      {title && title !== "Home" && (
        <Text
          numberOfLines={1}
          style={{
            fontSize: compact ? 20 : 24,
            fontFamily: "Inter_700Bold",
            color: c.foreground,
          }}
        >
          {title.startsWith("Hello") ? "Home" : title}
        </Text>
      )}
    </View>
  );
}
