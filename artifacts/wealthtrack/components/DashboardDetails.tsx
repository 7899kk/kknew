import React from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { Button, Card, formatCurrencyFull } from "./UI";
import { localDate } from "@/utils/financeValidation";
import { nextMonthSavingsPlan } from "@/utils/financeSummary";
import { transactionDateLabel } from "@/utils/transactionDetails";
export type DashboardDetail =
  | "Balance"
  | "Income"
  | "Expenses"
  | "Savings"
  | "Available to spend"
  | "Debts & credits";
const monthLabel = (month: string) =>
  new Date(month + "-01T12:00:00").toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
export function DashboardDetails({
  detail,
  onClose,
  onSelect,
}: {
  detail: DashboardDetail | null;
  onClose: () => void;
  onSelect: (value: DashboardDetail) => void;
}) {
  const app = useApp(),
    c = useColors(),
    insets = useSafeAreaInsets();
  const month = localDate().slice(0, 7);
  const expenses = app.expenses.filter((e) => e.date.startsWith(month));
  const incomes = app.incomes.filter((e) => e.date.startsWith(month));
  const goalSaved =
    app.goals.reduce((sum, g) => sum + Math.round(g.savedAmount * 100), 0) /
    100;
  const recurring =
    app.autoExpenses
      .filter((e) => e.isActive)
      .reduce((sum, e) => sum + Math.round(e.amount * 100), 0) / 100;
  const sum = (values: number[]) =>
    values.reduce((s, v) => s + Math.round(v * 100), 0) / 100;
  const owe = sum(
    app.obligations
      .filter((d) => d.status !== "Paid" && d.type === "debit")
      .map((d) => d.amount),
  );
  const owed = sum(
    app.obligations
      .filter((d) => d.status !== "Paid" && d.type === "credit")
      .map((d) => d.amount),
  );
  const forecast = nextMonthSavingsPlan(app);
  const line = (label: string, value: number, key = label) => (
    <View
      key={key}
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderColor: c.border,
      }}
    >
      <Text style={{ color: c.foreground, flex: 1, fontSize: 15 }}>
        {label}
      </Text>
      <Text style={{ color: c.foreground, fontSize: 16, fontWeight: "600" }}>
        {formatCurrencyFull(value)}
      </Text>
    </View>
  );
  return (
    <Modal
      visible={detail !== null}
      animationType="slide"
      onRequestClose={() => onClose()}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 24,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 32,
          backgroundColor: c.background,
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 26, fontWeight: "700", color: c.foreground }}>
          {detail}
        </Text>
        <Text style={{ color: c.mutedForeground }}>{monthLabel(month)}</Text>
        {detail === "Balance" && (
          <Card>
            {line("Starting savings", app.profile.currentSavings)}
            {line("Monthly income", app.totalIncome)}
            {line("Expenses", -app.totalExpenses)}
            {line("Balance", app.balance)}
          </Card>
        )}
        {detail === "Balance" && (
          <View style={{ gap: 8 }}>
            <Button
              title="View income"
              variant="secondary"
              onPress={() => onSelect("Income")}
            />
            <Button
              title="View expenses"
              variant="secondary"
              onPress={() => onSelect("Expenses")}
            />
            <Button
              title="View savings"
              variant="secondary"
              onPress={() => onSelect("Savings")}
            />
            <Button
              title="View debts & credits"
              variant="secondary"
              onPress={() => onSelect("Debts & credits")}
            />
          </View>
        )}
        {detail === "Available to spend" && (
          <Card>
            {line("Balance", app.balance)}
            {line("Reserved for goals", -goalSaved)}
            {line("Recurring bills reserved", -recurring)}
            {line("Loan payments reserved", -app.monthlyLoanPayments)}
            {line("Available to spend", app.availableBalance)}
          </Card>
        )}
        {detail === "Income" && (
          <>
            <Card>
              {line("Salary estimate", app.profile.monthlySalary)}
              {line("Other monthly income estimate", app.profile.otherIncome)}
              {line("Received this month", sum(incomes.map((i) => i.amount)))}
              {line("Total with salary reconciled", app.totalIncome)}
            </Card>
            <Text style={{ color: c.mutedForeground }}>
              Income marked Salary replaces the salary estimate up to that
              amount.
            </Text>
            {incomes.map((e) => (
              <Card key={e.id}>
                {line(e.name || "Money received", e.amount)}
                <Text style={{ color: c.mutedForeground }}>
                  {transactionDateLabel(e.date, e.time)}
                </Text>
              </Card>
            ))}
          </>
        )}
        {detail === "Expenses" && (
          <>
            <Card>
              {line("Total expenses", app.totalExpenses)}
              {Object.entries(
                expenses.reduce<Record<string, number>>((map, e) => {
                  map[e.category] =
                    (map[e.category] || 0) + Math.round(e.amount * 100);
                  return map;
                }, {}),
              ).map(([category, cents]) => line(category, cents / 100))}
            </Card>
            {expenses
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((e) => (
                <Card key={e.id}>
                  {line(e.notes || e.category, e.amount)}
                  <Text style={{ color: c.mutedForeground }}>
                    {transactionDateLabel(e.date, e.time)}
                  </Text>
                </Card>
              ))}
          </>
        )}
        {detail === "Savings" && (
          <>
            <Card>
              {line("Starting savings", app.profile.currentSavings)}
              {line("Reserved for dreams", goalSaved)}
            </Card>
            {app.goals.map((g) => (
              <Card key={g.id}>
                {line(`${g.emoji} ${g.name}`, g.savedAmount)}
                {line("Target", g.targetAmount)}
                {line(
                  "Suggested monthly saving",
                  forecast.suggestions[g.id] || 0,
                )}
              </Card>
            ))}
            <Button
              title="Manage goals"
              onPress={() => {
                onClose();
                router.push("/(tabs)/goals");
              }}
            />
          </>
        )}
        {detail === "Debts & credits" && (
          <>
            <Card>
              {line("You owe", owe)}
              {line("Owed to you", owed)}
              {line("Net receivable", Math.round((owed - owe) * 100) / 100)}
            </Card>
            {app.obligations
              .filter((d) => d.status !== "Paid")
              .map((d) => (
                <Card key={d.id}>
                  {line(d.name, d.amount)}
                  <Text style={{ color: c.mutedForeground }}>
                    {d.type === "debit" ? "You owe" : "Owed to you"}
                    {d.dueDate ? " · Due " + d.dueDate : ""}
                  </Text>
                </Card>
              ))}
            <Button
              title="Manage debts & credits"
              onPress={() => {
                onClose();
                router.push("/(tabs)/debts");
              }}
            />
          </>
        )}
        <Button title="Close" variant="secondary" onPress={() => onClose()} />
      </ScrollView>
    </Modal>
  );
}
