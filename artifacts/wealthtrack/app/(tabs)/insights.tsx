import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { ProFinancierHeader } from "@/components/ProFinancierHeader";
import {
  Card,
  PillSelector,
  Button,
  formatCurrencyFull,
} from "@/components/UI";
import { BudgetReports } from "@/components/BudgetReports";
import { SpendingBars } from "@/components/ReferenceCharts";
import { localDate } from "@/utils/financeValidation";
import { categoryTotals } from "@/utils/dashboardData";
import { spendingComparison } from "@/utils/reports";
export default function Insights() {
  const app = useApp(),
    c = useColors(),
    insets = useSafeAreaInsets();
  const [mode, setMode] = useState("Spending"),
    [month, setMonth] = useState(localDate().slice(0, 7));
  const [y, m] = month.split("-").map(Number);
  const values = Array.from({ length: 6 }, (_, i) => {
    const key = localDate(new Date(y, m - 6 + i, 1)).slice(0, 7),
      rows = mode === "Income" ? app.incomes : app.expenses;
    return (
      rows
        .filter((e) => e.date.startsWith(key))
        .reduce((s, e) => s + Math.round(e.amount * 100), 0) / 100
    );
  });
  const labels = Array.from({ length: 6 }, (_, i) =>
    new Date(y, m - 6 + i, 1).toLocaleDateString("en-IN", { month: "short" }),
  );
  const total =
    (mode === "Income" ? app.incomes : app.expenses)
      .filter((e) => e.date.startsWith(month))
      .reduce((s, e) => s + Math.round(e.amount * 100), 0) / 100;
  const cats = categoryTotals(app.expenses, month),
    compare = spendingComparison(month, app.expenses);
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ProFinancierHeader title="Insights" />
      <ScrollView
        contentContainerStyle={{
          padding: 18,
          paddingBottom: insets.bottom + 110,
          gap: 14,
        }}
      >
        <PillSelector
          options={["Spending", "Income"]}
          value={mode}
          onChange={setMode}
        />
        <Card>
          <Text style={{ color: c.mutedForeground, fontSize: 11 }}>
            {month} ·{" "}
            {mode === "Income" ? "Recorded income" : "Recorded spending"}
          </Text>
          <Text
            style={{
              color: c.foreground,
              fontSize: 34,
              fontFamily: "Inter_700Bold",
              marginTop: 10,
              marginBottom: 20,
            }}
          >
            {formatCurrencyFull(total)}
          </Text>
          <SpendingBars values={values} labels={labels} />
        </Card>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button
            title="Previous month"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() =>
              setMonth(localDate(new Date(y, m - 2, 1)).slice(0, 7))
            }
          />
          <Button
            title="Next month"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => setMonth(localDate(new Date(y, m, 1)).slice(0, 7))}
          />
        </View>
        <Card>
          <Text
            style={{
              color: c.foreground,
              fontSize: 17,
              fontFamily: "Inter_700Bold",
            }}
          >
            Category movement
          </Text>
          {cats.map((cat, i) => (
            <View key={cat.name} style={{ marginTop: 18, gap: 7 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: c.foreground, fontSize: 13 }}>
                  {cat.name}
                </Text>
                <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
                  {formatCurrencyFull(cat.amount)}
                </Text>
              </View>
              <View
                style={{ height: 4, backgroundColor: c.muted, borderRadius: 2 }}
              >
                <View
                  style={{
                    height: 4,
                    width: `${app.expenses.length && compare.current ? Math.min(100, (cat.amount / Math.max(...cats.map((c) => c.amount))) * 100) : 0}%`,
                    borderRadius: 2,
                    backgroundColor: [c.gold, c.chart3, c.chart2, c.chart4][
                      i % 4
                    ],
                  }}
                />
              </View>
            </View>
          ))}
          {!cats.length && (
            <Text style={{ color: c.mutedForeground, marginTop: 15 }}>
              No expenses recorded
            </Text>
          )}
        </Card>
        <Card>
          <Text style={{ fontSize: 12, color: c.mutedForeground }}>
            Compared with last month
          </Text>
          <Text style={{ fontSize: 14, color: c.foreground, marginTop: 8 }}>
            {compare.message}
          </Text>
        </Card>
        <BudgetReports />
      </ScrollView>
    </View>
  );
}
