import { validMoney, validDate, localDate } from "@/utils/financeValidation";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Expense, ExpenseCategory, PaymentType, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  formatCurrency,
  Input,
  PillSelector,
  ProgressBar,
  SectionHeader,
} from "@/components/UI";
import { PieChart } from "@/components/PieChart";

const CATEGORIES: ExpenseCategory[] = [
  "Food", "Travel", "Rent", "EMI", "Shopping",
  "Entertainment", "Medical", "Education", "Others",
];

const PAYMENT_TYPES: PaymentType[] = ["UPI", "Card", "Cash", "Bank"];

const CATEGORY_ICONS: Record<string, string> = {
  Food: "coffee", Travel: "navigation", Rent: "home",
  EMI: "calendar", Shopping: "shopping-bag", Entertainment: "film",
  Medical: "heart", Education: "book", Others: "more-horizontal",
};

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#f59e0b", Travel: "#3b82f6", Rent: "#8b5cf6",
  EMI: "#ef4444", Shopping: "#ec4899", Entertainment: "#06b6d4",
  Medical: "#10b981", Education: "#f97316", Others: "#6b7280",
};

type ViewMode = "All" | "Month" | "Year";

function today() {
  return localDate();
}

function nowTime() {
  return new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

export default function ExpensesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { expenses, addExpense, updateExpense, deleteExpense, totalIncome } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("Month");

  // Form fields
  const [date, setDate] = useState(today());
  const [time, setTime] = useState(nowTime());
  const [category, setCategory] = useState<ExpenseCategory>("Food");
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType>("UPI");
  const [notes, setNotes] = useState("");
  const [merchant, setMerchant] = useState("");
  const [upiRef, setUpiRef] = useState("");

  const reset = () => {
    setDate(today());
    setTime(nowTime());
    setCategory("Food");
    setAmount("");
    setPaymentType("UPI");
    setNotes("");
    setMerchant("");
    setUpiRef("");
    setEditingId(null);
  };

  const openAdd = () => {
    reset();
    setShowModal(true);
  };

  const openEdit = (exp: Expense) => {
    setDate(exp.date);
    setTime(exp.time || "");
    setCategory(exp.category);
    setAmount(exp.amount.toString());
    setPaymentType(exp.paymentType);
    setNotes(exp.notes || "");
    setMerchant(exp.merchant || "");
    setUpiRef(exp.upiRef || "");
    setEditingId(exp.id);
    setShowModal(true);
  };

  const save = () => {
    if (!validMoney(amount) || !validDate(date)) { Alert.alert("Check expense", "Enter a positive amount and valid date (YYYY-MM-DD)."); return; }
    const data: Partial<Expense> = {
      date,
      time: time || nowTime(),
      category,
      amount: Number(amount),
      paymentType,
      notes: notes.trim() || undefined,
      ...(notes.trim()?{needsReason:false}:{}),
      merchant: merchant || undefined,
      upiRef: upiRef || undefined,
    };
    if (editingId) {
      updateExpense(editingId, data);
    } else {
      addExpense(data as Omit<Expense, "id">);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
    reset();
  };

  const confirmDelete = (id: string) => {
    Alert.alert("Delete Expense", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteExpense(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentYear = `${now.getFullYear()}`;

  const filtered = useMemo(() => {
    const sorted = [...expenses].sort((a, b) => {
      const da = `${a.date} ${a.time || "00:00"}`;
      const db = `${b.date} ${b.time || "00:00"}`;
      return db.localeCompare(da);
    });
    if (viewMode === "Month") return sorted.filter((e) => e.date.startsWith(currentMonth));
    if (viewMode === "Year") return sorted.filter((e) => e.date.startsWith(currentYear));
    return sorted;
  }, [expenses, viewMode, currentMonth, currentYear]);

  const total = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);

  const catMap = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach((e) => { m[e.category] = (m[e.category] || 0) + e.amount; });
    return m;
  }, [filtered]);

  const pieSlices = useMemo(
    () =>
      Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amt]) => ({
          value: amt,
          color: CATEGORY_COLORS[cat] || colors.primary,
          label: cat,
        })),
    [catMap, colors.primary],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0),
        }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        maxToRenderPerBatch={20}
        windowSize={10}
        initialNumToRender={15}
        ListHeaderComponent={() => (
          <>
            {/* View mode */}
            <View style={{ marginBottom: 16 }}>
              <PillSelector
                options={["Month", "Year", "All"] as ViewMode[]}
                value={viewMode}
                onChange={setViewMode}
              />
            </View>

            {/* Summary */}
            <Card style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View>
                  <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                    Total Spent
                  </Text>
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: "700",
                      color: colors.expense,
                      fontFamily: "Inter_700Bold",
                    }}
                  >
                    {formatCurrency(total)}
                  </Text>
                </View>
                {totalIncome > 0 && (
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                      Budget Used
                    </Text>
                    <Text
                      style={{ fontSize: 24, fontWeight: "700", color: colors.foreground }}
                    >
                      {Math.round((total / totalIncome) * 100)}%
                    </Text>
                  </View>
                )}
              </View>
              {totalIncome > 0 && (
                <View style={{ marginTop: 12 }}>
                  <ProgressBar
                    progress={Math.min(total / totalIncome, 1)}
                    color={total > totalIncome ? colors.expense : colors.primary}
                    height={8}
                  />
                </View>
              )}
            </Card>

            {/* Pie chart */}
            {pieSlices.length > 0 && (
              <Card style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground, marginBottom: 16, fontFamily: "Inter_700Bold" }}>
                  Spending by Category
                </Text>
                <PieChart
                  slices={pieSlices}
                  thickness={38}
                  centerLabel="Spent"
                  centerValue={total}
                />
              </Card>
            )}

            <SectionHeader title="Transactions" />
          </>
        )}
        ListEmptyComponent={() => (
          <EmptyState
            icon="credit-card"
            title="No expenses yet"
            subtitle="Tap + to record your first expense"
          />
        )}
        renderItem={({ item }) => (
          <Pressable onPress={() => openEdit(item)} onLongPress={() => confirmDelete(item.id)}>
            <Card style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor:
                      (CATEGORY_COLORS[item.category] || colors.primary) + "18",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather
                    name={(CATEGORY_ICONS[item.category] || "circle") as any}
                    size={18}
                    color={CATEGORY_COLORS[item.category] || colors.primary}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>
                    {item.merchant || item.category}
                  </Text>
                  {item.merchant && (
                    <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 1 }}>
                      {item.category}
                    </Text>
                  )}
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 3, alignItems: "center", flexWrap: "wrap" }}>
                    <Feather name="calendar" size={11} color={colors.mutedForeground} />
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                      {item.date}
                    </Text>
                    {item.time ? (
                      <>
                        <Feather name="clock" size={11} color={colors.mutedForeground} />
                        <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                          {item.time}
                        </Text>
                      </>
                    ) : null}
                    <Badge
                      label={item.paymentType}
                      color={colors.primary}
                      bg={colors.accent}
                    />
                  </View>
                  {item.upiRef ? (
                    <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>
                      Ref: {item.upiRef}
                    </Text>
                  ) : null}
                  {item.notes ? (
                    <Text
                      style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}
                      numberOfLines={1}
                    >
                      {item.notes}
                    </Text>
                  ) : null}
                </View>

                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.expense }}>
                  -{formatCurrency(item.amount)}
                </Text>
              </View>
            </Card>
          </Pressable>
        )}
      />

      {/* Add Expense FAB */}
      <Pressable
        accessibilityLabel="Add expense"
        onPress={openAdd}
        style={{
          position: "absolute",
          bottom: insets.bottom + 90 + (Platform.OS === "web" ? 34 : 0),
          right: 16,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: colors.primary,
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
      >
        <Feather name="plus" size={24} color="#fff" />
      </Pressable>

      {/* Add / Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            padding: 24,
            paddingTop: Platform.OS === "ios" ? 40 : 24,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: "700",
                color: colors.foreground,
                fontFamily: "Inter_700Bold",
              }}
            >
              {editingId ? "Edit Expense" : "Add Expense"}
            </Text>
            <Pressable onPress={() => { setShowModal(false); reset(); }}>
              <Feather name="x" size={24} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Date & Time side by side */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1.4 }}>
                <Input
                  label="Date"
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Time"
                  value={time}
                  onChangeText={setTime}
                  placeholder="10:30 AM"
                />
              </View>
            </View>

            <Input
              label="Amount"
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              keyboardType="decimal-pad"
              prefix="₹"
            />

            <Input
              label="Merchant / Paid To (optional)"
              value={merchant}
              onChangeText={setMerchant}
              placeholder="Swiggy, Sharma Medical..."
            />

            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.mutedForeground,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Category
            </Text>
            <PillSelector
              options={CATEGORIES}
              value={category}
              onChange={setCategory}
            />
            <View style={{ height: 16 }} />

            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.mutedForeground,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Payment Type
            </Text>
            <PillSelector
              options={PAYMENT_TYPES}
              value={paymentType}
              onChange={setPaymentType}
            />
            <View style={{ height: 16 }} />

            <Input
              label="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="What was this for?"
              multiline
            />

            {(upiRef || paymentType === "UPI") && (
              <Input
                label="UPI Ref No. (optional)"
                value={upiRef}
                onChangeText={setUpiRef}
                placeholder="512345678901"
              />
            )}

            <View style={{ height: 24 }} />
            <Button
              title={editingId ? "Save Changes" : "Add Expense"}
              onPress={save}
              disabled={!Number.isFinite(Number(amount)) || Number(amount) <= 0}
            />
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({});
