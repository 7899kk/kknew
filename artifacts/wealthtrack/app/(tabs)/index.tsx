import React, { useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { ProFinancierHeader } from "@/components/ProFinancierHeader";
import { BudgetReports } from "@/components/BudgetReports";
import { SpendingInsight } from "@/components/SpendingInsight";
import { Button, Card, formatCurrencyFull, ProgressBar } from "@/components/UI";
import { localDate } from "@/utils/financeValidation";
import { nextMonthSavingsPlan } from "@/utils/financeSummary";
import { transactionDateLabel } from "@/utils/transactionDetails";

type Detail =
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
export default function DashboardScreen() {
  const app = useApp(),
    c = useColors(),
    insets = useSafeAreaInsets();
  const [detail, setDetail] = useState<Detail | null>(null);
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
    app.debts
      .filter((d) => d.status !== "Paid" && d.type === "debit")
      .map((d) => d.amount),
  );
  const owed = sum(
    app.debts
      .filter((d) => d.status !== "Paid" && d.type === "credit")
      .map((d) => d.amount),
  );
  const forecast = nextMonthSavingsPlan(app);
  const recent = [
    ...app.expenses.map((e) => ({ ...e, kind: "expense" })),
    ...app.incomes.map((e) => ({ ...e, kind: "income" })),
  ]
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || (b.timestamp || 0) - (a.timestamp || 0),
    )
    .slice(0, 5);
  const metrics: {
    title: Detail;
    amount: number;
    icon: React.ComponentProps<typeof Feather>["name"];
    color: string;
  }[] = [
    {
      title: "Income",
      amount: app.totalIncome,
      icon: "arrow-down-left",
      color: c.success,
    },
    {
      title: "Expenses",
      amount: app.totalExpenses,
      icon: "arrow-up-right",
      color: c.expense,
    },
    { title: "Savings", amount: goalSaved, icon: "target", color: c.primary },
    { title: "Debts & credits", amount: owe, icon: "users", color: c.warning },
  ];
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
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ProFinancierHeader
        title="Home"
        rightSlot={
          <Pressable
            accessibilityLabel="Open profile"
            accessibilityRole="button"
            onPress={() => router.push("/(tabs)/profile")}
            style={{ padding: 6 }}
          >
            {app.profile.profilePhoto ? (
              <Image
                source={{ uri: app.profile.profilePhoto }}
                style={{ width: 40, height: 40, borderRadius: 20 }}
              />
            ) : (
              <Feather name="user" size={26} color="white" />
            )}
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 110,
          gap: 16,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open balance details"
          onPress={() => setDetail("Balance")}
        >
          <Card style={{ backgroundColor: c.primary, padding: 24 }}>
            <Text style={{ color: "#ffffffbb", fontSize: 14 }}>
              {monthLabel(month)} · Balance
            </Text>
            <Text
              style={{
                color: "white",
                fontSize: 34,
                fontWeight: "700",
                marginTop: 10,
              }}
            >
              {formatCurrencyFull(app.balance)}
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 16,
              }}
            >
              <Text style={{ color: "white" }}>View breakdown</Text>
              <Feather name="arrow-up-right" size={20} color="white" />
            </View>
          </Card>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open available balance details"
          onPress={() => setDetail("Available to spend")}
        >
          <Card>
            <Text style={{ color: c.mutedForeground }}>Available to spend</Text>
            <Text
              style={{
                fontSize: 26,
                fontWeight: "700",
                color: app.availableBalance < 0 ? c.expense : c.foreground,
                marginTop: 6,
              }}
            >
              {formatCurrencyFull(app.availableBalance)}
            </Text>
          </Card>
        </Pressable>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {metrics.map((m) => (
            <Pressable
              key={m.title}
              accessibilityRole="button"
              accessibilityLabel={`Open ${m.title.toLowerCase()} details`}
              onPress={() => setDetail(m.title)}
              style={{ width: "48%", flexGrow: 1 }}
            >
              <Card style={{ minHeight: 125, gap: 10 }}>
                <Feather name={m.icon} size={23} color={m.color} />
                <Text style={{ color: c.mutedForeground }}>{m.title}</Text>
                <Text
                  style={{
                    color: c.foreground,
                    fontSize: 21,
                    fontWeight: "700",
                  }}
                >
                  {formatCurrencyFull(m.amount)}
                </Text>
              </Card>
            </Pressable>
          ))}
        </View>
        <SpendingInsight />
        <BudgetReports />
        {app.goals.some((g) => g.savedAmount < g.targetAmount) && (
          <Card>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{ color: c.foreground, fontSize: 18, fontWeight: "700" }}
              >
                {monthLabel(forecast.targetMonth)} dream plan
              </Text>
              <Feather name="target" size={22} color={c.primary} />
            </View>
            <Text style={{ color: c.mutedForeground, marginVertical: 10 }}>
              Based on {monthLabel(forecast.referenceMonth)}
              {forecast.estimated ? " · estimate" : ""}
            </Text>
            {!forecast.hasData ? (
              <Text style={{ color: c.mutedForeground }}>
                Add this month’s income and expenses to start.
              </Text>
            ) : (
              app.goals
                .filter((g) => g.savedAmount < g.targetAmount)
                .map((g) => (
                  <View key={g.id} style={{ marginTop: 12, gap: 8 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <Text style={{ color: c.foreground, flex: 1 }}>
                        {g.emoji} {g.name}
                      </Text>
                      <Text style={{ color: c.primary, fontWeight: "700" }}>
                        Save{" "}
                        {formatCurrencyFull(forecast.suggestions[g.id] || 0)}
                      </Text>
                    </View>
                    <ProgressBar
                      progress={
                        g.targetAmount ? g.savedAmount / g.targetAmount : 0
                      }
                      color={c.primary}
                      height={6}
                    />
                  </View>
                ))
            )}
            <Button
              title="Manage goals"
              variant="ghost"
              onPress={() => router.push("/(tabs)/goals")}
            />
          </Card>
        )}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            style={{ color: c.foreground, fontSize: 19, fontWeight: "700" }}
          >
            Recent activity
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(tabs)/activity")}
          >
            <Text style={{ color: c.primary, padding: 8 }}>View all</Text>
          </Pressable>
        </View>
        {recent.length ? (
          <Card>
            {recent.map((e) => (
              <Pressable
                key={e.id}
                accessibilityRole="button"
                onPress={() => router.push("/(tabs)/activity")}
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderColor: c.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{ flex: 1, color: c.foreground }}
                  >
                    {e.kind === "income"
                      ? "name" in e
                        ? e.name
                        : "Money received"
                      : e.notes || e.category}
                  </Text>
                  <Text
                    style={{
                      color: e.kind === "income" ? c.success : c.expense,
                      fontWeight: "700",
                    }}
                  >
                    {e.kind === "income" ? "+" : "−"}
                    {formatCurrencyFull(e.amount)}
                  </Text>
                </View>
                <Text
                  style={{
                    color: c.mutedForeground,
                    fontSize: 12,
                    marginTop: 6,
                  }}
                >
                  {transactionDateLabel(e.date, e.time)}
                </Text>
              </Pressable>
            ))}
          </Card>
        ) : (
          <Text style={{ color: c.mutedForeground }}>No activity yet</Text>
        )}
      </ScrollView>
      <Modal
        visible={detail !== null}
        animationType="slide"
        onRequestClose={() => setDetail(null)}
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
          <Text
            style={{ fontSize: 26, fontWeight: "700", color: c.foreground }}
          >
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
          {detail === "Available to spend" && (
            <Card>
              {line("Balance", app.balance)}
              {line("Reserved for goals", -goalSaved)}
              {line("Recurring bills reserved", -recurring)}
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
              <Card>{line("Reserved for dreams", goalSaved)}</Card>
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
                  setDetail(null);
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
              {app.debts
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
                  setDetail(null);
                  router.push("/(tabs)/debts");
                }}
              />
            </>
          )}
          <Button
            title="Close"
            variant="secondary"
            onPress={() => setDetail(null)}
          />
        </ScrollView>
      </Modal>
    </View>
  );
}
