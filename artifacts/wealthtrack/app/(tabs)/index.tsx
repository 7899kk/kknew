import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  Card,
  EmptyState,
  formatCurrency,
  formatCurrencyFull,
  ProgressBar,
  SectionHeader,
  StatCard,
} from "@/components/UI";
import { PieChart } from "@/components/PieChart";
import { MiniChart } from "@/components/MiniChart";
import { ProFinancierHeader } from "@/components/ProFinancierHeader";

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#f59e0b", Travel: "#3b82f6", Rent: "#8b5cf6",
  EMI: "#ef4444", Shopping: "#ec4899", Entertainment: "#06b6d4",
  Medical: "#10b981", Education: "#f97316", Others: "#6b7280",
};

const CATEGORY_ICONS: Record<string, string> = {
  Food: "coffee", Travel: "navigation", Rent: "home", EMI: "calendar",
  Shopping: "shopping-bag", Entertainment: "film", Medical: "heart",
  Education: "book", Others: "more-horizontal",
};

/** Animated counter that counts up from 0 to value */
function AnimatedCounter({ value, style }: { value: number; style?: object }) {
  const animVal = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = React.useState(0);

  useEffect(() => {
    const listener = animVal.addListener(({ value: v }) => setDisplay(v));
    Animated.timing(animVal, { toValue: value, duration: 1200, useNativeDriver: false }).start();
    return () => animVal.removeListener(listener);
  }, [value]);

  return (
    <Text style={style} adjustsFontSizeToFit numberOfLines={1}>
      {formatCurrencyFull(display)}
    </Text>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const app = useApp();

  // Staggered entrance animations
  const heroAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const chartAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(heroAnim, { toValue: 1, tension: 55, friction: 8, useNativeDriver: Platform.OS !== "web" }),
      Animated.spring(statsAnim, { toValue: 1, tension: 55, friction: 8, useNativeDriver: Platform.OS !== "web" }),
      Animated.spring(chartAnim, { toValue: 1, tension: 55, friction: 8, useNativeDriver: Platform.OS !== "web" }),
      Animated.spring(listAnim, { toValue: 1, tension: 55, friction: 8, useNativeDriver: Platform.OS !== "web" }),
    ]).start();
  }, []);

  const topExpCategories = useMemo(() => {
    const map: Record<string, number> = {};
    app.expenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [app.expenses]);

  const monthlyExpenses = useMemo(() => {
    const map: Record<string, number> = {};
    app.expenses.forEach((e) => { const m = e.date.slice(0, 7); map[m] = (map[m] || 0) + e.amount; });
    const sorted = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
    return sorted.slice(-6).map(([, v]) => v);
  }, [app.expenses]);

  const recentExpenses = useMemo(
    () => [...app.expenses].sort((a, b) => `${b.date}${b.time || ""}`.localeCompare(`${a.date}${a.time || ""}`)).slice(0, 4),
    [app.expenses],
  );

  const topGoal = app.goals[0];

  const financePieSlices = useMemo(() => {
    const slices = [];
    if (app.totalIncome > 0) slices.push({ value: app.totalIncome, color: colors.success, label: "Income" });
    if (app.totalExpenses > 0) slices.push({ value: app.totalExpenses, color: colors.expense, label: "Expenses" });
    if (app.totalInvestments > 0) slices.push({ value: app.totalInvestments, color: colors.primary, label: "Investments" });
    if (app.totalDebt > 0) slices.push({ value: app.totalDebt, color: colors.debt, label: "Debt" });
    return slices;
  }, [app]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ProFinancierHeader
        title={`Hello, ${app.profile.name || "there"} 👋`}
        subtitle="Your financial overview"
        rightSlot={
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            style={{ backgroundColor: "#ffffff20", width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" }}
          >
            <Feather name="user" size={18} color="#fff" />
          </Pressable>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 + (Platform.OS === "web" ? 34 : 0), paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 3D Net Worth Hero Card ── */}
        <Animated.View
          style={{
            opacity: heroAnim,
            transform: [
              { translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
              { scale: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
            ],
            marginHorizontal: 16,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              borderRadius: 24,
              overflow: "hidden",
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
              shadowOpacity: 0.45,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 10 },
              elevation: 14,
            }}
          >
            {/* Decorative 3D depth layers */}
            <View style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: "#ffffff12" }} />
            <View style={{ position: "absolute", top: 10, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: "#ffffff08" }} />
            <View style={{ position: "absolute", bottom: -20, left: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: "#00000010" }} />
            {/* Shiny top stripe */}
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, backgroundColor: "#ffffff25" }} />

            <View style={{ padding: 22, paddingBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Feather name="trending-up" size={14} color="#ffffff80" />
                <Text style={{ color: "#ffffff80", fontSize: 12, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" }}>
                  Total Net Worth
                </Text>
              </View>
              <AnimatedCounter
                value={app.netWorth}
                style={{ color: "#fff", fontSize: Math.min(screenW * 0.085, 36), fontWeight: "700", fontFamily: "Inter_700Bold" }}
              />
              <Text style={{ color: "#ffffff60", fontSize: 12, marginTop: 4 }}>
                PRO FINANCIER · Personal Finance
              </Text>
            </View>


            <View style={{ flexDirection: "row", backgroundColor: "#00000015", paddingVertical: 14, paddingHorizontal: 16 }}>
              {[
                { label: "Income", val: app.totalIncome, icon: "arrow-down-circle" },
                { label: "Expenses", val: app.totalExpenses, icon: "arrow-up-circle" },
                { label: "Savings", val: app.totalSavings, icon: "pocket" },
              ].map((item) => (
                <View key={item.label} style={{ flex: 1, alignItems: "center" }}>
                  <Feather name={item.icon as any} size={13} color="#ffffff70" />
                  <Text style={{ color: "#ffffff60", fontSize: 10, marginTop: 2, marginBottom: 2 }}>{item.label}</Text>
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }} numberOfLines={1} adjustsFontSizeToFit>
                    {formatCurrency(item.val)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        <View style={{ paddingHorizontal: 16 }}>
          {/* ── Quick Stats ── */}
          <Animated.View
            style={{
              opacity: statsAnim,
              transform: [{ translateY: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            }}
          >
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
              <StatCard label="Review payments" amount={app.paymentReviews.reduce((sum,e)=>sum+e.amount,0)} color={colors.primary} icon="activity" />
              <StatCard label="Total Debt" amount={app.totalDebt} color={colors.debt} icon="alert-circle" />
            </View>
          </Animated.View>

          {/* ── Finance Overview Pie Chart ── */}
          {financePieSlices.length > 0 && (
            <Animated.View
              style={{
                opacity: chartAnim,
                transform: [{ translateY: chartAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
              }}
            >
              <SectionHeader title="Finance Overview" />
              <Card style={{ marginBottom: 20 }}>
                <PieChart
                  slices={financePieSlices}
                  thickness={38}
                  centerLabel="Net Worth"
                  centerValue={app.netWorth}
                />
              </Card>
            </Animated.View>
          )}

          {/* ── Top Goal ── */}
          {topGoal && (
            <Animated.View style={{ opacity: listAnim }}>
              <SectionHeader title="Top Goal" action="All Goals" onAction={() => router.push("/(tabs)/goals")} />
              <Card style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                  <View style={{ gap: 2, flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" }}>
                      {topGoal.emoji} {topGoal.name}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                      {formatCurrency(topGoal.savedAmount)} of {formatCurrency(topGoal.targetAmount)}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 48, height: 48, borderRadius: 24,
                      backgroundColor: colors.primary + "18",
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primary }}>
                      {topGoal.targetAmount > 0 ? Math.round((topGoal.savedAmount / topGoal.targetAmount) * 100) : 0}%
                    </Text>
                  </View>
                </View>
                <ProgressBar
                  progress={topGoal.targetAmount > 0 ? topGoal.savedAmount / topGoal.targetAmount : 0}
                  color={colors.primary}
                  height={10}
                />
              </Card>
            </Animated.View>
          )}

          {/* ── Recent Expenses ── */}
          {recentExpenses.length > 0 && (
            <Animated.View style={{ opacity: listAnim, transform: [{ translateY: listAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
              <SectionHeader title="Recent Expenses" action="See All" onAction={() => router.push("/(tabs)/expenses")} />
              <Card style={{ marginBottom: 20, padding: 0 }}>
                {recentExpenses.map((exp, i) => (
                  <View
                    key={exp.id}
                    style={{
                      flexDirection: "row", alignItems: "center",
                      padding: 14, gap: 12,
                      borderBottomWidth: i < recentExpenses.length - 1 ? 1 : 0,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <View
                      style={{
                        width: 40, height: 40, borderRadius: 12,
                        backgroundColor: (CATEGORY_COLORS[exp.category] || colors.primary) + "20",
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Feather
                        name={(CATEGORY_ICONS[exp.category] || "shopping-bag") as any}
                        size={16}
                        color={CATEGORY_COLORS[exp.category] || colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>
                        {exp.merchant || exp.category}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 6, alignItems: "center", marginTop: 2 }}>
                        <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{exp.date}</Text>
                        {exp.time ? <Text style={{ fontSize: 12, color: colors.mutedForeground }}>· {exp.time}</Text> : null}
                        <Text style={{ fontSize: 12, color: colors.mutedForeground }}>· {exp.paymentType}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: colors.expense }}>
                      -{formatCurrency(exp.amount)}
                    </Text>
                  </View>
                ))}
              </Card>
            </Animated.View>
          )}

          {app.expenses.length === 0 && app.goals.length === 0 && (
            <EmptyState
              icon="activity"
              title="Your dashboard is empty"
              subtitle="Start by adding expenses or goals to see your financial overview."
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
