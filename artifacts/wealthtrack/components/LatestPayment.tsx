import React from "react";
import { Text, View } from "react-native";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { Card, formatCurrencyFull } from "./UI";
import { transactionDateLabel } from "@/utils/transactionDetails";
export function LatestPayment() {
  const app = useApp(),
    c = useColors();
  const latest = [
    ...app.expenses
      .filter((e) => e.captureId)
      .map((e) => ({ ...e, direction: "debited" })),
    ...app.incomes
      .filter((e) => e.captureId)
      .map((e) => ({ ...e, direction: "credited" })),
  ].sort(
    (a, b) =>
      (b.timestamp || new Date(b.date + "T" + (b.time || "00:00")).getTime()) -
      (a.timestamp || new Date(a.date + "T" + (a.time || "00:00")).getTime()),
  )[0];
  if (!latest) return null;
  return (
    <Card style={{ marginBottom: 16 }}>
      <Text
        style={{ color: c.mutedForeground, fontSize: 12, fontWeight: "600" }}
      >
        LATEST AUTOMATIC PAYMENT
      </Text>
      <Text
        style={{
          color: latest.direction === "credited" ? c.success : c.expense,
          fontSize: 22,
          fontWeight: "700",
          marginVertical: 8,
        }}
      >
        {formatCurrencyFull(latest.amount)} {latest.direction}
      </Text>
      <Text style={{ color: c.foreground }}>
        {transactionDateLabel(latest.date, latest.time)}
      </Text>
      <Text style={{ color: c.mutedForeground, marginTop: 6 }}>
        {latest.source} · Saved in Activity
      </Text>
    </Card>
  );
}
