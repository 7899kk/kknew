import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { transactionDateLabel } from "@/utils/transactionDetails";
import { Button, formatCurrencyFull } from "./UI";
export function PaymentToast() {
  const { captureNotice, dismissCaptureNotice } = useApp(),
    c = useColors(),
    insets = useSafeAreaInsets();
  useEffect(() => {
    if (!captureNotice) return;
    const timer = setTimeout(dismissCaptureNotice, 8000);
    return () => clearTimeout(timer);
  }, [captureNotice, dismissCaptureNotice]);
  if (!captureNotice) return null;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        position: "absolute",
        bottom: insets.bottom + 82,
        left: 16,
        right: 16,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.card,
        elevation: 12,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 8,
        zIndex: 100,
      }}
    >
      <Text
        style={{
          color: captureNotice.kind === "income" ? c.success : c.expense,
          fontWeight: "700",
          fontSize: 20,
        }}
      >
        {formatCurrencyFull(captureNotice.amount)}{" "}
        {captureNotice.kind === "income" ? "credited" : "debited"}
      </Text>
      <Text style={{ color: c.foreground, marginVertical: 8 }}>
        {transactionDateLabel(captureNotice.date, captureNotice.time)}
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          title="View payment"
          style={{ flex: 1 }}
          onPress={() => {
            dismissCaptureNotice();
            router.push("/(tabs)/activity");
          }}
        />
        <Button
          title="Dismiss"
          variant="ghost"
          style={{ flex: 1 }}
          onPress={dismissCaptureNotice}
        />
      </View>
    </View>
  );
}
