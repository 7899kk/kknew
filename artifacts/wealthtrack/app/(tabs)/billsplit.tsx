import { calculateSettlements } from "@/utils/billSettlements";
import { validMoney, validDate, localDate } from "@/utils/financeValidation";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
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
import { BillGroup, BillExpense, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  formatCurrency,
  Input,
  PillSelector,
  SectionHeader,
} from "@/components/UI";

export default function BillSplitScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { billGroups, addBillGroup, deleteBillGroup, addBillExpense, deleteBillExpense } = useApp();

  const [selectedGroup, setSelectedGroup] = useState<BillGroup | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Group form
  const [groupName, setGroupName] = useState("");
  const [membersText, setMembersText] = useState("");

  // Expense form
  const [expDescription, setExpDescription] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expPaidBy, setExpPaidBy] = useState("");
  const [expSplitAmong, setExpSplitAmong] = useState<string[]>([]);

  const resetGroup = () => { setGroupName(""); setMembersText(""); };
  const resetExpense = () => { setExpDescription(""); setExpAmount(""); setExpPaidBy(""); setExpSplitAmong([]); };

  const saveGroup = () => {
    if (!groupName.trim() || !membersText.trim()) return;
    const members = [...new Set(membersText
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m.length > 0))];
    if (members.length < 2) {
      Alert.alert("Error", "Add at least 2 members (comma-separated)");
      return;
    }
    addBillGroup({ name: groupName.trim(), members });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowGroupModal(false);
    resetGroup();
  };

  const saveExpense = () => {
    if (!selectedGroup || !expDescription.trim() || !expPaidBy) return;
    if (!validMoney(expAmount) || !selectedGroup.members.includes(expPaidBy)) { Alert.alert("Check bill", "Enter a positive amount and select a group member who paid."); return; }
    const splitAmong = expSplitAmong.length > 0 ? expSplitAmong : selectedGroup.members;
    addBillExpense(selectedGroup.id, {
      description: expDescription.trim(),
      amount: parseFloat(expAmount),
      paidBy: expPaidBy,
      splitAmong,
      date: localDate(),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowExpenseModal(false);
    resetExpense();

  };

  const confirmDeleteGroup = (id: string) => {
    Alert.alert("Delete Group", "This will delete all expenses in this group.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteBillGroup(id);
          setSelectedGroup(null);
        },
      },
    ]);
  };

  // View a specific group
  const currentGroup = billGroups.find((g) => g.id === selectedGroup?.id) || selectedGroup;

  if (currentGroup) {
    const settlements = calculateSettlements(currentGroup);
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 90 + (Platform.OS === "web" ? 34 : 0),
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Group header */}
          <Card style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" }}>
                  {currentGroup.name}
                </Text>
                <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 2 }}>
                  {currentGroup.members.length} members
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Pressable onPress={() => setSelectedGroup(null)}>
                  <Feather name="arrow-left" size={22} color={colors.primary} />
                </Pressable>
                <Pressable onPress={() => confirmDeleteGroup(currentGroup.id)}>
                  <Feather name="trash-2" size={20} color={colors.expense} />
                </Pressable>
              </View>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {currentGroup.members.map((m) => (
                <Badge key={m} label={m} color={colors.primary} bg={colors.accent} />
              ))}
            </View>
          </Card>

          {/* Total */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
            <Card style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Total Spent</Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" }}>
                {formatCurrency(currentGroup.expenses.reduce((s, e) => s + e.amount, 0))}
              </Text>
            </Card>
            <Card style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Per Person</Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" }}>
                {currentGroup.members.length > 0
                  ? formatCurrency(
                      currentGroup.expenses.reduce((s, e) => s + e.amount, 0) /
                        currentGroup.members.length
                    )
                  : "₹0"}
              </Text>
            </Card>
          </View>

          {/* Settlements */}
          {settlements.length > 0 && (
            <>
              <SectionHeader title="Settlements" />
              <Card style={{ marginBottom: 16, padding: 0 }}>
                {settlements.map((s, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 14,
                      borderBottomWidth: i < settlements.length - 1 ? 1 : 0,
                      borderBottomColor: colors.border,
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontWeight: "600", color: colors.expense }}>{s.from}</Text>
                    <Feather name="arrow-right" size={14} color={colors.mutedForeground} />
                    <Text style={{ fontWeight: "600", color: colors.success }}>{s.to}</Text>
                    <View style={{ flex: 1 }} />
                    <Text style={{ fontWeight: "700", color: colors.foreground }}>
                      {formatCurrency(s.amount)}
                    </Text>
                  </View>
                ))}
              </Card>
            </>
          )}

          {/* Expenses */}
          <SectionHeader title="Expenses" />
          {currentGroup.expenses.length === 0 ? (
            <EmptyState icon="receipt" title="No expenses yet" subtitle="Tap + to add an expense" />
          ) : (
            currentGroup.expenses.map((exp) => (
              <Card key={exp.id} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>
                      {exp.description}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 2 }}>
                      Paid by {exp.paidBy} · Split {exp.splitAmong.length} ways
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                      ₹{(exp.amount / exp.splitAmong.length).toFixed(0)}/person · {exp.date}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>
                      {formatCurrency(exp.amount)}
                    </Text>
                    <Pressable onPress={() => deleteBillExpense(currentGroup.id, exp.id)}>
                      <Feather name="x" size={16} color={colors.mutedForeground} />
                    </Pressable>
                  </View>
                </View>
              </Card>
            ))
          )}
        </ScrollView>

        {/* FAB */}
        <Pressable
          onPress={() => {
            resetExpense();
            setExpPaidBy(currentGroup.members[0] || "");
            setExpSplitAmong([...currentGroup.members]);
            setShowExpenseModal(true);
          }}
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

        {/* Add expense modal */}
        <Modal
          visible={showExpenseModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowExpenseModal(false)}
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
                marginBottom: 24,
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
                Add Expense
              </Text>
              <Pressable onPress={() => setShowExpenseModal(false)}>
                <Feather name="x" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input label="Description" value={expDescription} onChangeText={setExpDescription} placeholder="e.g. Dinner, Hotel, Petrol" />
              <Input label="Total Amount" value={expAmount} onChangeText={setExpAmount} placeholder="0" keyboardType="decimal-pad" prefix="₹" />

              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.mutedForeground, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Paid By
              </Text>
              <PillSelector
                options={currentGroup.members}
                value={expPaidBy}
                onChange={setExpPaidBy}
              />
              <View style={{ height: 16 }} />

              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.mutedForeground, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Split Among
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {currentGroup.members.map((m) => {
                  const selected = expSplitAmong.includes(m);
                  return (
                    <Pressable
                      key={m}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setExpSplitAmong((prev) =>
                          selected ? prev.filter((x) => x !== m) : [...prev, m]
                        );
                      }}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: selected ? colors.primary : colors.secondary,
                        borderWidth: 1,
                        borderColor: selected ? colors.primary : colors.border,
                      }}
                    >
                      <Text style={{ color: selected ? colors.primaryForeground : colors.foreground, fontSize: 13, fontWeight: "600" }}>
                        {m}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {expAmount && expSplitAmong.length > 0 && (
                <Card
                  style={{ marginTop: 16, backgroundColor: colors.secondary }}
                >
                  <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                    Each person pays:{" "}
                    <Text style={{ fontWeight: "700", color: colors.foreground }}>
                      {formatCurrency(parseFloat(expAmount) / expSplitAmong.length)}
                    </Text>
                  </Text>
                </Card>
              )}

              <View style={{ height: 24 }} />
              <Button
                title="Add Expense"
                onPress={saveExpense}
                disabled={!expDescription.trim() || !expAmount || !expPaidBy}
              />
            </ScrollView>
          </View>
        </Modal>
      </View>
    );
  }

  // Group list view
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={billGroups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 90 + (Platform.OS === "web" ? 34 : 0),
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <SectionHeader title="Groups" />
        )}
        ListEmptyComponent={() => (
          <EmptyState
            icon="users"
            title="No groups yet"
            subtitle="Create a group with friends to start splitting expenses"
          />
        )}
        renderItem={({ item }) => {
          const total = item.expenses.reduce((s, e) => s + e.amount, 0);
          return (
            <Pressable onPress={() => setSelectedGroup(item)}>
              <Card style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      backgroundColor: colors.accent,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather name="users" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" }}>
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 2 }}>
                      {item.members.length} members · {item.expenses.length} expenses
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>
                      {formatCurrency(total)}
                    </Text>
                    <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />

      {/* FAB */}
      <Pressable
        onPress={() => { resetGroup(); setShowGroupModal(true); }}
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

      {/* Create group modal */}
      <Modal
        visible={showGroupModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowGroupModal(false)}
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
              marginBottom: 24,
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
              Create Group
            </Text>
            <Pressable onPress={() => setShowGroupModal(false)}>
              <Feather name="x" size={24} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <Input label="Group Name" value={groupName} onChangeText={setGroupName} placeholder="e.g. Goa Trip, Flat Mates" />
          <Input
            label="Members (comma-separated)"
            value={membersText}
            onChangeText={setMembersText}
            placeholder="e.g. Rahul, Priya, Ravi, Anita"
            multiline
          />

          {membersText.trim() && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {membersText
                .split(",")
                .map((m) => m.trim())
                .filter((m) => m.length > 0)
                .map((m) => (
                  <Badge key={m} label={m} color={colors.primary} bg={colors.accent} />
                ))}
            </View>
          )}

          <Button title="Create Group" onPress={saveGroup} disabled={!groupName.trim() || !membersText.trim()} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({});
