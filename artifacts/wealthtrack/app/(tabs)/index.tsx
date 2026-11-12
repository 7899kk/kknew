import { recordedCashFlow } from "@/utils/dashboardData";
import { GoalImage } from "@/components/GoalImage";
import { AnimatedMoney } from "@/components/AnimatedMoney";
import { Image } from "react-native";
import { paymentReminders, remindersDue } from "@/utils/paymentReminders";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { router, type Href } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { ProFinancierHeader } from "@/components/ProFinancierHeader";
import {
  Card,
  formatCurrencyFull,
  PillSelector,
  ProgressBar,
} from "@/components/UI";
import {
  DashboardDetails,
  type DashboardDetail,
} from "@/components/DashboardDetails";
import { BalanceChart } from "@/components/ReferenceCharts";
import { PieChart } from "@/components/PieChart";
import { monthlyBalancePoints, categoryTotals } from "@/utils/dashboardData";
import { localDate } from "@/utils/financeValidation";
import { nextMonthSavingsPlan } from "@/utils/financeSummary";
import { loanSummary } from "@/utils/loans";
import { spendingComparison } from "@/utils/reports";
export default function DashboardScreen() {
  const app = useApp(),
    c = useColors(),
    insets = useSafeAreaInsets(),
    { width } = useWindowDimensions();
  const [detail, setDetail] = useState<DashboardDetail | null>(null),
    [period, setPeriod] = useState("Month");
  const month = localDate().slice(0, 7),
    forecast = nextMonthSavingsPlan(app),
    comparison = spendingComparison(month, app.expenses);
  const categories = categoryTotals(app.expenses, month),
    palette = [
      c.gold,
      c.chart3,
      c.chart2,
      c.chart4,
      c.chart5,
      c.chart6,
      c.chart7,
      c.chart8,
    ];
  const allPoints = monthlyBalancePoints(
    app.profile,
    app.incomes,
    app.expenses,
    month,
  );
  const day = new Date().getDate();
  const today = new Date();
  let yearlyFlow = 0;
  const yearPoints = Array.from({ length: 12 }, (_, i) => {
    const key = localDate(
      new Date(today.getFullYear(), today.getMonth() - 11 + i, 1),
    ).slice(0, 7);
    yearlyFlow +=
      app.incomes
        .filter((e) => e.date.startsWith(key))
        .reduce((s, e) => s + Math.round(e.amount * 100), 0) -
      app.expenses
        .filter((e) => e.date.startsWith(key))
        .reduce((s, e) => s + Math.round(e.amount * 100), 0);
    return yearlyFlow / 100;
  });
  const points =
    period === "Year"
      ? yearPoints
      : period === "Week"
        ? allPoints.slice(Math.max(0, day - 6), day + 1)
        : allPoints;
  const monthName = new Date(month + "-01T12:00:00").toLocaleDateString(
    "en-IN",
    { month: "long", year: "numeric" },
  );
  const topGoal =
    app.goals.find((g) => g.savedAmount < g.targetAmount) || app.goals[0];
  const cash = recordedCashFlow(app, month);
  const dueSoon = remindersDue(paymentReminders(app));
  const upcoming = app.loans
    .filter((l) => l.kind === "borrowed")
    .map((l) => ({ loan: l, ...loanSummary(l) }))
    .filter((l) => l.remaining > 0)
    .sort((a, b) => (a.next?.date || "").localeCompare(b.next?.date || ""));
  const metric = (
    title: string,
    value: number,
    kind: DashboardDetail,
    color: string,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${kind.toLowerCase()} details`}
      onPress={() => setDetail(kind)}
      style={{ flex: 1 }}
    >
      <Card style={{ gap: 9, padding: 16 }}>
        <Text style={{ color: c.mutedForeground, fontSize: 12 }}>{title}</Text>
        <AnimatedMoney
          value={value}
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{
            color,
            fontSize: 22,
            fontFamily: "Inter_700Bold",
          }}
        ></AnimatedMoney>
        <View
          style={{ height: 3, borderRadius: 2, backgroundColor: color + "35" }}
        >
          <View
            style={{
              height: 3,
              width: "65%",
              backgroundColor: color,
              borderRadius: 2,
            }}
          />
        </View>
      </Card>
    </Pressable>
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ProFinancierHeader title="Home" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 18,
          paddingBottom: insets.bottom + 105,
          gap: 13,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open balance details"
          onPress={() => setDetail("Balance")}
          style={{ paddingHorizontal: 3, paddingTop: 6 }}
        >
          <Text
            style={{
              fontSize: 10,
              letterSpacing: 1.3,
              color: c.mutedForeground,
            }}
          >
            MONTHLY BALANCE
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginTop: 10,
            }}
          >
            <AnimatedMoney
              value={app.balance}
              fromZero
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{
                fontSize: 38,
                fontFamily: "Inter_700Bold",
                color: c.foreground,
                flexShrink: 1,
              }}
            ></AnimatedMoney>
            {comparison.hasPrevious && comparison.percent !== null && (
              <View
                style={{
                  backgroundColor:
                    comparison.difference <= 0
                      ? c.incomeLight
                      : c.expense + "15",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    color: comparison.difference <= 0 ? c.income : c.expense,
                  }}
                >
                  {comparison.percent}%{" "}
                  {comparison.difference <= 0 ? "less" : "more"} spent
                </Text>
              </View>
            )}
          </View>
          <Text
            style={{ color: c.mutedForeground, fontSize: 11, marginTop: 9 }}
          >
            {monthName}
          </Text>
        </Pressable>
        <View style={{ alignItems: "center", marginTop: 3 }}>
          <BalanceChart data={points} width={Math.max(200, width - 40)} />
        </View>
        {period === "Year" && (
          <Text
            style={{
              textAlign: "center",
              fontSize: 10,
              color: c.mutedForeground,
            }}
          >
            Recorded cash flow · last 12 months
          </Text>
        )}
        <PillSelector
          options={["Week", "Month", "Year"]}
          value={period}
          onChange={setPeriod}
        />
        <View style={{ flexDirection: "row", gap: 12 }}>
          {metric("Income", app.totalIncome, "Income", c.income)}
          {metric("Expenses", app.totalExpenses, "Expenses", c.expense)}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open available balance details"
          onPress={() => setDetail("Available to spend")}
        >
          <Card
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
              Available to spend
            </Text>
            <Text
              style={{
                fontSize: 20,
                fontFamily: "Inter_700Bold",
                color: c.foreground,
              }}
            >
              {formatCurrencyFull(app.availableBalance)}
            </Text>
          </Card>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open finance overview details"
          onPress={() => setDetail("Expenses")}
        >
          <Card>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View style={{ width: 125 }}>
                <PieChart
                  showLegend={false}
                  size={125}
                  thickness={15}
                  slices={categories.map((cat, i) => ({
                    value: cat.amount,
                    label: cat.name,
                    color: palette[i % palette.length],
                  }))}
                  centerLabel="Spent"
                  centerValue={app.totalExpenses}
                />
              </View>
              <View style={{ flex: 1, gap: 11 }}>
                {categories.length ? (
                  categories.slice(0, 5).map((cat, i) => (
                    <View
                      key={cat.name}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <View
                        style={{
                          height: 6,
                          width: 6,
                          borderRadius: 3,
                          backgroundColor: palette[i],
                        }}
                      />
                      <Text
                        numberOfLines={1}
                        style={{
                          flex: 1,
                          fontSize: 11,
                          color: c.mutedForeground,
                        }}
                      >
                        {cat.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: c.foreground }}>
                        {app.totalExpenses
                          ? Math.round((cat.amount / app.totalExpenses) * 100)
                          : 0}
                        %
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
                    No spending recorded
                  </Text>
                )}
              </View>
            </View>
          </Card>
        </Pressable>
        <View style={{ flexDirection: "row", gap: 9 }}>
          {[
            { title: "Dues", icon: "repeat" as const, route: "debts" },
            { title: "Goals", icon: "target" as const, route: "goals" },
            { title: "Split", icon: "users" as const, route: "billsplit" },
          ].map((link) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={link.title}
              key={link.title}
              onPress={() => router.push(`/(tabs)/${link.route}` as Href)}
              style={{ flex: 1 }}
            >
              <Card style={{ padding: 13, alignItems: "center", gap: 7 }}>
                <Feather name={link.icon} size={18} color={c.foreground} />
                <Text style={{ color: c.foreground, fontSize: 11 }}>
                  {link.title}
                </Text>
              </Card>
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open debts & credits details"
          onPress={() => setDetail("Debts & credits")}
        >
          <Card style={{ flexDirection: "row", gap: 15 }}>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={{ color: c.mutedForeground, fontSize: 11 }}>
                You owe
              </Text>
              <Text
                style={{
                  color: c.expense,
                  fontFamily: "Inter_700Bold",
                  fontSize: 20,
                }}
              >
                {formatCurrencyFull(app.totalDebt)}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={{ color: c.mutedForeground, fontSize: 11 }}>
                Owed to you
              </Text>
              <Text
                style={{
                  color: c.income,
                  fontFamily: "Inter_700Bold",
                  fontSize: 20,
                }}
              >
                {formatCurrencyFull(app.totalCredit)}
              </Text>
            </View>
          </Card>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open monthly loan payments"
          onPress={() => router.push("/(tabs)/loans" as Href)}
        >
          <Card>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: c.goldLight,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="credit-card" size={18} color={c.foreground} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: c.mutedForeground, fontSize: 11 }}>
                  Loan payments due
                </Text>
                <Text
                  style={{
                    color: c.foreground,
                    fontFamily: "Inter_700Bold",
                    fontSize: 22,
                  }}
                >
                  {formatCurrencyFull(app.monthlyLoanPayments)}
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={17}
                color={c.mutedForeground}
              />
            </View>
            {upcoming.slice(0, 3).map((item) => (
              <View
                key={item.loan.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <Text style={{ color: c.foreground, fontSize: 12, flex: 1 }}>
                  {item.loan.name}
                </Text>
                <Text
                  style={{
                    color: item.overdue > 0 ? c.destructive : c.mutedForeground,
                    fontSize: 11,
                  }}
                >
                  {item.next?.date} ·{" "}
                  {formatCurrencyFull(item.next?.remaining || 0)}
                </Text>
              </View>
            ))}
          </Card>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open savings details"
          onPress={() => setDetail("Savings")}
        >
          <Card>
            <View
              style={{ flexDirection: "row", gap: 13, alignItems: "center" }}
            >
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  borderWidth: 4,
                  borderColor: c.successLight,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="target" size={20} color={c.success} />
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    color: c.foreground,
                  }}
                >
                  {topGoal
                    ? `${topGoal.emoji || "◎"} ${topGoal.name}`
                    : "Goal savings"}
                </Text>
                <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
                  {topGoal
                    ? `${formatCurrencyFull(topGoal.savedAmount)} / ${formatCurrencyFull(topGoal.targetAmount)}`
                    : formatCurrencyFull(app.goalSavings)}
                </Text>
              </View>
              <Feather name="plus" size={18} color={c.foreground} />
            </View>
            {topGoal?.imageUri && (
              <View style={{ marginVertical: 10 }}>
                <GoalImage uri={topGoal.imageUri} emoji={topGoal.emoji} />
              </View>
            )}
            {topGoal && (
              <View style={{ marginTop: 13, gap: 8 }}>
                <ProgressBar
                  progress={topGoal.savedAmount / topGoal.targetAmount}
                  color={c.gold}
                  height={4}
                />
                <Text style={{ fontSize: 11, color: c.mutedForeground }}>
                  {forecast.targetMonth}: save{" "}
                  {formatCurrencyFull(forecast.suggestions[topGoal.id] || 0)}
                  {forecast.estimated ? " · estimate" : ""}
                </Text>
              </View>
            )}
          </Card>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(tabs)/insights" as Href)}
        >
          <Text
            style={{
              textAlign: "center",
              color: c.mutedForeground,
              fontSize: 12,
              padding: 8,
            }}
          >
            View insights →
          </Text>
        </Pressable>
        <Card>
          <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold" }}>
            Recorded cash flow
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 12,
            }}
          >
            <Text style={{ color: c.income }}>Income</Text>
            <Text style={{ color: c.income }}>
              {formatCurrencyFull(cash.earned)}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 10,
            }}
          >
            <Text style={{ color: c.expense }}>Spent</Text>
            <Text style={{ color: c.expense }}>
              {formatCurrencyFull(app.totalExpenses)}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 10,
            }}
          >
            <Text style={{ color: c.foreground }}>Net recorded</Text>
            <AnimatedMoney
              value={cash.net}
              style={{
                color: cash.net >= 0 ? c.income : c.expense,
                fontFamily: "Inter_700Bold",
              }}
            />
          </View>
        </Card>
        {dueSoon.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open upcoming payments"
            onPress={() => router.push("/(tabs)/others" as Href)}
          >
            <Card>
              <Text style={{ color: c.expense, fontFamily: "Inter_700Bold" }}>
                Due within 7 days or overdue · {dueSoon.length}
              </Text>
              {dueSoon.slice(0, 3).map((item) => (
                <Text
                  key={item.id}
                  style={{ color: c.foreground, marginTop: 9 }}
                >
                  {item.title} · {formatCurrencyFull(item.amount)} ·{" "}
                  {item.dueDate}
                </Text>
              ))}
            </Card>
          </Pressable>
        )}
        {app.expenses.length + app.incomes.length > 0 && (
          <Card>
            <Text
              style={{
                color: c.foreground,
                fontFamily: "Inter_700Bold",
                marginBottom: 10,
              }}
            >
              Latest activity
            </Text>
            {[
              ...app.expenses.map((e) => ({ ...e, direction: "debit" })),
              ...app.incomes.map((e) => ({ ...e, direction: "credit" })),
            ]
              .sort(
                (a, b) =>
                  b.date.localeCompare(a.date) ||
                  (b.timestamp || 0) - (a.timestamp || 0),
              )
              .slice(0, 5)
              .map((e) => (
                <Pressable
                  key={e.id}
                  accessibilityRole="button"
                  accessibilityLabel={"View activity " + e.id}
                  onPress={() => router.push("/(tabs)/activity" as Href)}
                  style={{
                    paddingVertical: 10,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.foreground }}>
                      {("name" in e && e.name) ||
                        e.notes ||
                        e.category ||
                        "Payment"}
                    </Text>
                    <Text
                      style={{
                        color: c.mutedForeground,
                        fontSize: 11,
                        marginTop: 4,
                      }}
                    >
                      {e.category} · {e.date}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: e.direction === "credit" ? c.income : c.expense,
                    }}
                  >
                    {e.direction === "credit" ? "+" : "−"}
                    {formatCurrencyFull(e.amount)}
                  </Text>
                </Pressable>
              ))}
          </Card>
        )}
      </ScrollView>
      <DashboardDetails
        detail={detail}
        onClose={() => setDetail(null)}
        onSelect={setDetail}
      />
    </View>
  );
}
