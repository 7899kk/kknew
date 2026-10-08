import { validMoney, validDate, localDate } from "@/utils/financeValidation";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useRef, useEffect, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DebtEntry, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  formatCurrency,
  Input,
  PillSelector,
  SectionHeader,
  StatCard,
} from "@/components/UI";
import { PieChart } from "@/components/PieChart";

type DebtType = "debit" | "credit";

function AnimatedNumber({ value, color }: { value: number; color: string }) {
  const colors = useColors();
  const animVal = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    animVal.setValue(0);
    const listener = animVal.addListener(({ value: v }) => setDisplay(v));
    Animated.timing(animVal, { toValue: value, duration: 800, useNativeDriver: false }).start();
    return () => animVal.removeListener(listener);
  }, [value]);

  return (
    <Text style={{ fontSize: 22, fontWeight: "700", color, fontFamily: "Inter_700Bold" }}>
      {formatCurrency(display)}
    </Text>
  );
}

export default function DebtsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { debts, addDebt, updateDebt, deleteDebt } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"You Owe" | "Owed to You">("You Owe");

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [interest, setInterest] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<"Paid" | "Pending">("Pending");
  const [type, setType] = useState<DebtType>("debit");

  // Hero entrance animation
  const heroAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(heroAnim, { toValue: 1, tension: 60, friction: 9, useNativeDriver: Platform.OS !== "web" }).start();
  }, []);

  const reset = () => {
    setName(""); setAmount(""); setInterest(""); setDueDate("");
    setStatus("Pending");
    setType(tab === "You Owe" ? "debit" : "credit");
    setEditingId(null);
  };

  const openAdd = () => { reset(); setType(tab === "You Owe" ? "debit" : "credit"); setShowModal(true); };
  const openEdit = (debt: DebtEntry) => {
    setName(debt.name); setAmount(debt.amount.toString());
    setInterest(debt.interest?.toString() || ""); setDueDate(debt.dueDate || "");
    setStatus(debt.status); setType(debt.type); setEditingId(debt.id); setShowModal(true);
  };

  const save = () => {
    if (!name.trim() || !validMoney(amount) || !validMoney(interest,true,true) || !validDate(dueDate,true)) { Alert.alert("Check debt", "Enter a name, positive amount, non-negative interest and valid date."); return; }
    const data = { name: name.trim(), amount: parseFloat(amount), interest: interest ? parseFloat(interest) : undefined, dueDate: dueDate || undefined, status, type };
    if (editingId) updateDebt(editingId, data);
    else addDebt(data);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false); reset();
  };

  const confirmDelete = (id: string) => {
    Alert.alert("Delete Entry", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { deleteDebt(id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } },
    ]);
  };

  const debits = debts.filter((d) => d.type === "debit");
  const credits = debts.filter((d) => d.type === "credit");
  const currentList = tab === "You Owe" ? debits : credits;

  const totalDebt = debits.filter((d) => d.status === "Pending").reduce((s, d) => s + d.amount, 0);
  const totalCredit = credits.filter((d) => d.status === "Pending").reduce((s, d) => s + d.amount, 0);
  const paidDebt = debits.filter((d) => d.status === "Paid").reduce((s, d) => s + d.amount, 0);
  const paidCredit = credits.filter((d) => d.status === "Paid").reduce((s, d) => s + d.amount, 0);
  const netBalance = totalCredit - totalDebt;

  const pieSlices = useMemo(() => {
    const slices = [];
    if (totalDebt > 0) slices.push({ value: totalDebt, color: colors.expense, label: "You Owe (Pending)" });
    if (totalCredit > 0) slices.push({ value: totalCredit, color: colors.success, label: "Owed to You" });
    if (paidDebt > 0) slices.push({ value: paidDebt, color: colors.mutedForeground + "80", label: "You Paid" });
    if (paidCredit > 0) slices.push({ value: paidCredit, color: colors.primary + "60", label: "Received" });
    return slices;
  }, [totalDebt, totalCredit, paidDebt, paidCredit, colors]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={currentList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0) }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <>
            {/* Animated 3D-style hero summary */}
            <Animated.View style={{ opacity: heroAnim, transform: [{ scale: heroAnim }], marginBottom: 16 }}>
              <View
                style={{
                  borderRadius: 24,
                  overflow: "hidden",
                  backgroundColor: netBalance >= 0 ? colors.success : colors.expense,
                  shadowColor: netBalance >= 0 ? colors.success : colors.expense,
                  shadowOpacity: 0.35,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 10,
                }}
              >
                {/* Top shimmer stripe */}
                <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, backgroundColor: "#ffffff30" }} />
                <View style={{ padding: 22 }}>
                  <Text style={{ color: "#ffffff99", fontSize: 12, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                    Net Balance
                  </Text>
                  <AnimatedNumber value={netBalance} color="#ffffff" />
                  <Text style={{ color: "#ffffff80", fontSize: 12, marginTop: 4 }}>
                    {netBalance >= 0 ? "People owe you more — you're net positive" : "You owe more — you're net negative"}
                  </Text>
                </View>

                {/* Bottom stats row */}
                <View style={{ flexDirection: "row", backgroundColor: "#00000015", paddingVertical: 12, paddingHorizontal: 16 }}>
                  {[
                    { label: "You Owe", val: totalDebt, icon: "arrow-up-right" },
                    { label: "Owed to You", val: totalCredit, icon: "arrow-down-left" },
                  ].map((item) => (
                    <View key={item.label} style={{ flex: 1, alignItems: "center" }}>
                      <Feather name={item.icon as any} size={14} color="#ffffff80" />
                      <Text style={{ color: "#ffffff60", fontSize: 11, marginTop: 2 }}>{item.label}</Text>
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }} numberOfLines={1} adjustsFontSizeToFit>
                        {formatCurrency(item.val)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </Animated.View>

            {/* Pie Chart */}
            {pieSlices.length > 0 && (
              <Card style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground, marginBottom: 16, fontFamily: "Inter_700Bold" }}>
                  Debt Breakdown
                </Text>
                <PieChart
                  slices={pieSlices}
                  thickness={40}
                  centerLabel="Total"
                  centerValue={totalDebt + totalCredit + paidDebt + paidCredit}
                />
              </Card>
            )}

            {/* Quick stats */}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              <StatCard label="You Owe" amount={totalDebt} color={colors.debt} icon="arrow-up-right" />
              <StatCard label="Owed to You" amount={totalCredit} color={colors.success} icon="arrow-down-left" />
            </View>

            {/* Tab toggle */}
            <View style={{ flexDirection: "row", backgroundColor: colors.secondary, borderRadius: 12, padding: 4, marginBottom: 16 }}>
              {(["You Owe", "Owed to You"] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center",
                    backgroundColor: tab === t ? colors.card : "transparent",
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "600", color: tab === t ? colors.foreground : colors.mutedForeground }}>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>
            <SectionHeader title={tab === "You Owe" ? "Your Debts" : "Money Receivable"} />
          </>
        )}
        ListEmptyComponent={() => (
          <EmptyState
            icon="alert-circle"
            title={tab === "You Owe" ? "No debts tracked" : "No credits tracked"}
            subtitle="Tap + to add an entry"
          />
        )}
        renderItem={({ item }) => (
          <Pressable onPress={() => openEdit(item)} onLongPress={() => confirmDelete(item.id)}>
            <Card style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 44, height: 44, borderRadius: 14,
                    backgroundColor: item.type === "debit" ? "#fee2e2" : colors.successLight,
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Feather
                    name={item.type === "debit" ? "arrow-up-right" : "arrow-down-left"}
                    size={18}
                    color={item.type === "debit" ? colors.expense : colors.success}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>{item.name}</Text>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 3, alignItems: "center", flexWrap: "wrap" }}>
                    {item.dueDate && (
                      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Due: {item.dueDate}</Text>
                    )}
                    {item.interest ? (
                      <Text style={{ fontSize: 12, color: colors.warning }}>{item.interest}% interest</Text>
                    ) : null}
                  </View>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: item.type === "debit" ? colors.expense : colors.success }}>
                    {formatCurrency(item.amount)}
                  </Text>
                  <Badge
                    label={item.status}
                    color={item.status === "Paid" ? colors.success : colors.warning}
                    bg={item.status === "Paid" ? colors.successLight : colors.warningLight}
                  />
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />

      {/* FAB */}
      <Pressable
        onPress={openAdd}
        style={{
          position: "absolute", bottom: insets.bottom + 90 + (Platform.OS === "web" ? 34 : 0), right: 16,
          width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary,
          alignItems: "center", justifyContent: "center",
          shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
        }}
      >
        <Feather name="plus" size={24} color="#fff" />
      </Pressable>

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: Platform.OS === "ios" ? 40 : 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" }}>
              {editingId ? "Edit Entry" : "Add Entry"}
            </Text>
            <Pressable onPress={() => { setShowModal(false); reset(); }}>
              <Feather name="x" size={24} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.mutedForeground, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Type
            </Text>
            <PillSelector options={["debit", "credit"] as DebtType[]} value={type} onChange={setType} />
            <View style={{ height: 16 }} />
            <Input label={type === "debit" ? "Lender Name" : "Borrower Name"} value={name} onChangeText={setName} placeholder="Person or institution" />
            <Input label="Amount" value={amount} onChangeText={setAmount} placeholder="0" keyboardType="decimal-pad" prefix="₹" />
            <Input label="Interest % (optional)" value={interest} onChangeText={setInterest} placeholder="e.g. 12" keyboardType="decimal-pad" />
            <Input label="Due Date (optional)" value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" />
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.mutedForeground, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Status
            </Text>
            <PillSelector options={["Pending", "Paid"] as ("Pending" | "Paid")[]} value={status} onChange={setStatus} />
            <View style={{ height: 24 }} />
            <Button title={editingId ? "Save Changes" : "Add Entry"} onPress={save} disabled={!name.trim() || !amount} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
