import { SpendingInsight } from "./SpendingInsight";
import { notify } from "@/utils/dialogs";
import React, { useState } from "react";
import { Alert, Modal, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Crypto from "expo-crypto";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { categories } from "@/utils/ledgerSchema";
import { monthlyReport } from "@/utils/reports";
import { localDate, validMoney } from "@/utils/financeValidation";
import { Button, Card, Input, PillSelector, formatCurrencyFull } from "./UI";
export function BudgetReports() {
  const app = useApp(),
    c = useColors(),
    insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false),
    [month, setMonth] = useState(localDate().slice(0, 7)),
    [category, setCategory] = useState<string>("Food"),
    [limit, setLimit] = useState("");
  const report = monthlyReport(
    month,
    app.profile,
    app.incomes,
    app.expenses,
    app.budgets,
  );
  const previousMonth = (() => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return localDate(d).slice(0, 7);
  })();
  const previous = monthlyReport(
    previousMonth,
    app.profile,
    app.incomes,
    app.expenses,
    app.budgets,
  );
  const shift = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    setMonth(localDate(new Date(y, m - 1 + delta, 1)).slice(0, 7));
    setLimit("");
  };
  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Button
          title="Open budgets and reports"
          onPress={() => {
            setMonth(localDate().slice(0, 7));
            setOpen(true);
          }}
        />
      </Card>
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 24,
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
            backgroundColor: c.background,
            flexGrow: 1,
            gap: 16,
          }}
        >
          <Text
            style={{ color: c.foreground, fontSize: 24, fontWeight: "700" }}
          >
            {month} report
          </Text>
          <Button
            title="Previous month"
            variant="secondary"
            onPress={() => shift(-1)}
          />
          <Button
            title="Next month"
            variant="secondary"
            onPress={() => shift(1)}
          />
          <SpendingInsight month={month} />
          <Card>
            <Text style={{ color: c.foreground }}>
              Estimated income: {formatCurrencyFull(report.income)}
              {`\n`}Confirmed expenses: {formatCurrencyFull(report.expenses)}
              {`\n`}Surplus before recurring bills:{" "}
              {formatCurrencyFull(report.surplus)}
              {`\n`}Expense change from {previousMonth}:{" "}
              {formatCurrencyFull(report.expenses - previous.expenses)}
            </Text>
            <Text style={{ color: c.mutedForeground, marginTop: 10 }}>
              Income uses your current salary and other-income estimates for
              each selected month, offset by labeled salary credits. Past income
              estimates are not historical bank balances.
            </Text>
          </Card>
          <Text
            style={{ color: c.foreground, fontSize: 18, fontWeight: "700" }}
          >
            Spending by category
          </Text>
          {Object.entries(report.breakdown).map(([cat, total]) => (
            <Text key={cat} style={{ color: c.foreground }}>
              {cat}: {formatCurrencyFull(total)}
            </Text>
          ))}
          {!Object.keys(report.breakdown).length && (
            <Text style={{ color: c.mutedForeground }}>
              No confirmed expenses for this month.
            </Text>
          )}
          <Text
            style={{ color: c.foreground, fontSize: 18, fontWeight: "700" }}
          >
            Monthly budgets
          </Text>
          {report.budgets.map((b) => (
            <Card key={b.id}>
              <Text style={{ color: c.foreground, fontWeight: "700" }}>
                {b.category} · Limit {formatCurrencyFull(b.limit)}
              </Text>
              <Text
                style={{
                  color: b.remaining < 0 ? c.destructive : c.foreground,
                  marginVertical: 10,
                }}
              >
                Spent {formatCurrencyFull(b.spent)} ·{" "}
                {b.remaining < 0 ? "Over budget" : "Remaining"}{" "}
                {formatCurrencyFull(Math.abs(b.remaining))}
              </Text>
              <Button
                title="Edit limit"
                variant="secondary"
                onPress={() => {
                  setCategory(b.category);
                  setLimit(String(b.limit));
                }}
              />
              <Button
                title="Remove budget"
                variant="ghost"
                onPress={() => app.deleteBudget(b.id)}
              />
            </Card>
          ))}
          <Card>
            <Text
              style={{
                color: c.foreground,
                fontWeight: "700",
                marginBottom: 12,
              }}
            >
              Set or replace a category limit
            </Text>
            <PillSelector
              options={[...categories]}
              value={category}
              onChange={(v) => {
                setCategory(v);
                const b = report.budgets.find((b) => b.category === v);
                setLimit(b ? String(b.limit) : "");
              }}
            />
            <Input
              label="Limit (INR)"
              value={limit}
              onChangeText={setLimit}
              keyboardType="decimal-pad"
            />
            <Button
              title="Save monthly limit"
              onPress={() => {
                if (!validMoney(limit)) {
                  notify(
                    "Check limit",
                    "Enter a positive amount with up to two decimal places.",
                  );
                  return;
                }
                app.setBudget({
                  id: Crypto.randomUUID(),
                  month,
                  category: category as (typeof categories)[number],
                  limit: Number(limit),
                });
                setLimit("");
              }}
            />
          </Card>
          <Button
            title="Close"
            variant="ghost"
            onPress={() => setOpen(false)}
          />
        </ScrollView>
      </Modal>
    </>
  );
}
