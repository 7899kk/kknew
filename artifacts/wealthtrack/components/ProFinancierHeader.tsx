import React from "react";
import { Image, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface Props {
  title?: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  compact?: boolean;
}

export function ProFinancierHeader({ title, subtitle, rightSlot, compact }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const logoSize = compact ? 36 : 46;

  return (
    <View
      style={{
        backgroundColor: colors.primary,
        paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8),
        paddingBottom: compact ? 12 : 16,
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        elevation: 6,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
        {/* High-quality logo — render at 3× display size so it stays crisp on every screen density */}
        <View
          style={{
            width: logoSize,
            height: logoSize,
            borderRadius: compact ? 10 : 13,
            overflow: "hidden",
            borderWidth: 1.5,
            borderColor: "#ffffff30",
          }}
        >
          <Image
            source={require("../assets/images/logo.png")}
            style={{ width: logoSize, height: logoSize }}
            resizeMode="cover"
            fadeDuration={0}
          />
        </View>

        <View style={{ flex: 1 }}>
          {!compact && (
            <Text
              style={{
                fontSize: 10,
                color: "#ffffff99",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 1.8,
                fontFamily: "Inter_600SemiBold",
              }}
            >
              PRO FINANCIER
            </Text>
          )}
          {title && (
            <Text
              style={{
                fontSize: compact ? 16 : 19,
                fontWeight: "700",
                color: "#ffffff",
                fontFamily: "Inter_700Bold",
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {title}
            </Text>
          )}
          {subtitle && (
            <Text style={{ fontSize: 12, color: "#ffffffaa" }} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightSlot && <View>{rightSlot}</View>}
    </View>
  );
}

const styles = StyleSheet.create({});
