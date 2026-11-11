import React from "react";
import { Text } from "react-native";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { localDate } from "@/utils/financeValidation";
import { spendingComparison } from "@/utils/reports";
import { Card, formatCurrencyFull } from "./UI";
export function SpendingInsight({
  month = localDate().slice(0, 7),
}: {
  month?: string;
}) {
  const app = useApp(),
    c = useColors(),
    comparison = spendingComparison(month, app.expenses);
  return (
    <Card style={{ marginBottom: 16 }}>
      <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "700" }}>
        Your monthly spending
      </Text>
      <Text
        style={{
          color:
            comparison.hasPrevious && comparison.difference > 0
              ? c.expense
              : c.foreground,
          marginTop: 10,
          fontSize: 16,
        }}
      >
        {comparison.message}
      </Text>
      <Text style={{ color: c.mutedForeground, marginTop: 8 }}>
        {comparison.isCurrent
          ? "Compared with the same number of days last month."
          : "Compared with the previous full month."}{" "}
        Only expenses saved in this app are included.
      </Text>
      {comparison.hasPrevious &&
        comparison.increases.map((e) => (
          <Text key={e.category} style={{ color: c.foreground, marginTop: 8 }}>
            {e.category}: {formatCurrencyFull(e.amount)} more
          </Text>
        ))}
    </Card>
  );
}
