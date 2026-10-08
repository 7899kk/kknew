import { goalSavingsPlan } from "@/utils/financeSummary";
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
import { SavingsGoal, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  Button,
  Card,
  EmptyState,
  formatCurrency,
  Input,
  ProgressBar,
  SectionHeader,
} from "@/components/UI";

const GOAL_EMOJIS = ["🎯", "🏍", "🚗", "🏠", "✈️", "💍", "📱", "🎓", "💻", "🏖️", "🏋️", "🎮"];

const GOAL_PRESETS = [
  { emoji: "🏍", label: "Bike", desc: "Two-wheeler purchase" },
  { emoji: "🚗", label: "Car", desc: "Four-wheeler purchase" },
  { emoji: "🏠", label: "Home / Flat", desc: "Property or down payment" },
  { emoji: "✈️", label: "Vacation", desc: "Travel & holiday fund" },
  { emoji: "📱", label: "Gadget", desc: "Phone, laptop or device" },
  { emoji: "💍", label: "Wedding", desc: "Marriage expenses" },
  { emoji: "🎓", label: "Education", desc: "Course or degree fund" },
  { emoji: "🛡️", label: "Emergency Fund", desc: "Safety net savings" },
  { emoji: "🎯", label: "Custom", desc: "Set your own goal" },
];

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDateLabel(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function GoalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { goals, addGoal, updateGoal, deleteGoal, addGoalSavings, monthlySurplus, availableBalance } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [fundingGoal, setFundingGoal] = useState<SavingsGoal | null>(null);
  const [fundingAmount, setFundingAmount] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [savedAmount, setSavedAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [emoji, setEmoji] = useState("🎯");

  const reset = () => {
    setName(""); setDescription(""); setTargetAmount(""); setSavedAmount(""); setTargetDate(""); setEmoji("🎯");
    setEditingId(null);
    setShowPresets(false);
  };

  const openAdd = () => { reset(); setShowPresets(true); setShowModal(true); };

  const openEdit = (goal: SavingsGoal) => {
    setName(goal.name);
    setDescription(goal.description || "");
    setTargetAmount(goal.targetAmount.toString());
    setSavedAmount(goal.savedAmount.toString());
    setTargetDate(goal.targetDate || "");
    setEmoji(goal.emoji || "🎯");
    setEditingId(goal.id);
    setShowPresets(false);
    setShowModal(true);
  };

  const selectPreset = (preset: typeof GOAL_PRESETS[0]) => {
    setEmoji(preset.emoji);
    setName(preset.label === "Custom" ? "" : preset.label);
    setDescription(preset.desc);
    setShowPresets(false);
  };

  const save = () => {
    if (!name.trim() || !validMoney(targetAmount) || !validMoney(savedAmount,true,true) || !validDate(targetDate,true)) { Alert.alert("Check goal", "Enter a name, positive target, non-negative savings and valid date."); return; }
    const saved = Number(savedAmount) || 0;
    const oldSaved = goals.find(g => g.id === editingId)?.savedAmount || 0;
    if (saved > Number(targetAmount)) { Alert.alert("Check savings", "Saved money cannot exceed the goal target."); return; }
    if (saved - oldSaved > Math.max(0, availableBalance)) { Alert.alert("Not enough available money", "Reduce the saved amount or update your income and starting savings."); return; }
    const data = {
      name: name.trim(),
      description: description.trim() || undefined,
      targetAmount: parseFloat(targetAmount),
      savedAmount: parseFloat(savedAmount) || 0,
      targetDate: targetDate || undefined,
      emoji,
    };
    editingId ? updateGoal(editingId, data) : addGoal(data);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
    reset();
  };

  const confirmDelete = (id: string) => {
    Alert.alert("Delete Goal", "Remove this savings goal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteGoal(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const addToSavings = (goal: SavingsGoal, amount: number) => {
    const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
    if (amount > remaining || amount > Math.max(0, availableBalance)) {
      Alert.alert("Check savings", `You can reserve up to ${formatCurrency(Math.min(remaining, Math.max(0, availableBalance)))} for this goal.`);
      return;
    }
    addGoalSavings(goal.id, amount);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const monthlyNeeded = (goal: SavingsGoal): string | null => {
    const plan = goalSavingsPlan(goal, monthlySurplus);
    return plan.monthlyAmount > 0 ? formatCurrency(plan.monthlyAmount) : null;
  };

  const estimateMonths = (goal: SavingsGoal): string => {
    const plan = goalSavingsPlan(goal, monthlySurplus);
    if (plan.remaining <= 0) return "Goal reached! 🎉";
    if (plan.monthlyAmount <= 0) return "No monthly surplus yet. Reduce expenses or add income.";
    return `About ${Math.ceil(plan.remaining / plan.monthlyAmount)} months at this saving rate`;
  };

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={goals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 90 + (Platform.OS === "web" ? 34 : 0),
        }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        maxToRenderPerBatch={15}
        ListHeaderComponent={() => (
          <>
            {goals.length > 0 && (
              <Card
                style={{ marginBottom: 20, backgroundColor: colors.primary }}
              >
                <Text style={{ color: "#ffffff99", fontSize: 13, marginBottom: 4 }}>
                  Total Goals Progress
                </Text>
                <Text
                  style={{
                    color: "#ffffff",
                    fontSize: 26,
                    fontWeight: "700",
                    fontFamily: "Inter_700Bold",
                  }}
                >
                  {formatCurrency(totalSaved)} / {formatCurrency(totalTarget)}
                </Text>
                <View style={{ marginTop: 12 }}>
                  <ProgressBar
                    progress={totalTarget > 0 ? totalSaved / totalTarget : 0}
                    color="#ffffff"
                    height={8}
                  />
                </View>
                <Text style={{ color: "#ffffff80", fontSize: 12, marginTop: 8 }}>
                  {totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}% of all goals funded
                </Text>
              </Card>
            )}
            <SectionHeader title="Your Goals" />
          </>
        )}
        ListEmptyComponent={() => (
          <EmptyState
            icon="target"
            title="No goals yet"
            subtitle="Tap + to set your first dream goal and track your progress"
          />
        )}
        renderItem={({ item }) => {
          const pct = item.targetAmount > 0 ? item.savedAmount / item.targetAmount : 0;
          const remaining = item.targetAmount - item.savedAmount;
          const reached = item.savedAmount >= item.targetAmount;
          const days = item.targetDate ? daysUntil(item.targetDate) : null;
          const monthly = monthlyNeeded(item);
          const overdue = days !== null && days < 0;

          return (
            <Card style={{ marginBottom: 14 }}>
              {/* Header row */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <View style={{ flexDirection: "row", gap: 10, alignItems: "center", flex: 1 }}>
                  <View
                    style={{
                      width: 48, height: 48, borderRadius: 14,
                      backgroundColor: colors.accent,
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 26 }}>{item.emoji || "🎯"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" }}>
                      {item.name}
                    </Text>
                    {item.description ? (
                      <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 1 }}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                  <Pressable onPress={() => openEdit(item)} hitSlop={8}>
                    <Feather name="edit-2" size={16} color={colors.mutedForeground} />
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(item.id)} hitSlop={8}>
                    <Feather name="trash-2" size={16} color={colors.expense} />
                  </Pressable>
                </View>
              </View>

              {/* Target date + deadline banner */}
              {item.targetDate && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: overdue
                      ? colors.expense + "15"
                      : reached
                      ? colors.success + "15"
                      : colors.primary + "12",
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                    marginBottom: 12,
                  }}
                >
                  <Feather
                    name="calendar"
                    size={13}
                    color={overdue ? colors.expense : reached ? colors.success : colors.primary}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: overdue ? colors.expense : reached ? colors.success : colors.primary,
                      flex: 1,
                    }}
                  >
                    {overdue
                      ? "Overdue — target was "
                      : reached
                      ? "Reached before "
                      : "Target: "}
                    {formatDateLabel(item.targetDate)}
                  </Text>
                  {!overdue && !reached && days !== null && (
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                      {days === 0 ? "Today!" : `${days}d left`}
                    </Text>
                  )}
                </View>
              )}

              {/* Amounts row */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontSize: 14, color: colors.foreground }}>
                  Saved:{" "}
                  <Text style={{ fontWeight: "700", color: colors.success }}>
                    {formatCurrency(item.savedAmount)}
                  </Text>
                </Text>
                <Text style={{ fontSize: 14, color: colors.foreground }}>
                  Target:{" "}
                  <Text style={{ fontWeight: "700" }}>{formatCurrency(item.targetAmount)}</Text>
                </Text>
              </View>

              <ProgressBar
                progress={Math.min(pct, 1)}
                color={reached ? colors.success : colors.primary}
                height={10}
              />

              {/* Status row */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8, alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  {reached ? (
                    <Text style={{ fontSize: 13, color: colors.success, fontWeight: "600" }}>
                      🎉 Goal reached!
                    </Text>
                  ) : (
                    <>
                      <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
                        Save {formatCurrency(Math.max(0, remaining))} more for this dream
                      </Text>
                      {monthly ? (
                        <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600", marginTop: 2 }}>
                          {monthly}/month {item.targetDate ? "needed" : "suggested"}
                        </Text>
                      ) : (
                        <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
                          {estimateMonths(item)}
                        </Text>
                      )}
                    </>
                  )}
                </View>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: reached ? colors.success : colors.primary,
                    fontFamily: "Inter_700Bold",
                  }}
                >
                  {Math.min(Math.round(pct * 100), 100)}%
                </Text>
              </View>

              {!reached && <Text style={{fontSize:12,color:colors.mutedForeground,marginTop:8}}>{estimateMonths(item)}. Savings are reserved from available money.</Text>}
              {!reached && item.targetDate && !goalSavingsPlan(item, monthlySurplus).affordable && <Text style={{fontSize:12,color:colors.expense,marginTop:4}}>This deadline needs more than your monthly surplus. Extend it or reduce expenses.</Text>}
              {/* Quick add buttons */}
              {!reached && (
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                  {Array.from(new Set([Math.min(1000, Math.max(0, remaining)), 5000, 10000])).filter(amt => amt > 0).map((amt) => (
                    <Pressable
                      key={amt}
                      accessibilityLabel={`Save ${amt} toward ${item.name}`}
                      onPress={() => addToSavings(item, amt)}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: colors.secondary,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
                        +₹{amt >= 1000 ? `${amt / 1000}K` : amt}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {!reached && <Button title="Add savings amount" variant="secondary" onPress={() => {setFundingGoal(item);setFundingAmount("");}} style={{marginTop:10}} />}
            </Card>
          );
        }}
      />

      {/* FAB */}
      <Pressable
        accessibilityLabel="Add goal"
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

      <Modal visible={!!fundingGoal} transparent animationType="fade" onRequestClose={() => setFundingGoal(null)}>
        <View style={{flex:1,justifyContent:"center",padding:24,backgroundColor:"#00000088"}}>
          <Card>
            <Text style={{color:colors.foreground,fontSize:18,fontWeight:"700",marginBottom:12}}>Save toward {fundingGoal?.name}</Text>
            <Text style={{color:colors.mutedForeground,marginBottom:12}}>Available to reserve: {formatCurrency(Math.max(0,availableBalance))}</Text>
            <Input label="Savings amount" value={fundingAmount} onChangeText={setFundingAmount} keyboardType="decimal-pad" prefix="₹" />
            <Button title="Reserve savings" onPress={() => {
              if (!fundingGoal || !validMoney(fundingAmount)) {Alert.alert("Check amount","Enter a positive amount with up to two decimal places.");return;}
              const amount=Number(fundingAmount);
              if(amount>Math.max(0,availableBalance) || amount>fundingGoal.targetAmount-fundingGoal.savedAmount) {Alert.alert("Check amount","Amount exceeds the money available or the goal remaining.");return;}
              addToSavings(fundingGoal,amount);setFundingGoal(null);
            }} />
            <Button title="Cancel" variant="ghost" onPress={() => setFundingGoal(null)} style={{marginTop:8}} />
          </Card>
        </View>
      </Modal>
      {/* Add / Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowModal(false); reset(); }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            padding: 24,
            paddingTop: Platform.OS === "ios" ? 40 : 24,
          }}
        >
          {/* Header */}
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
              {editingId ? "Edit Goal" : "New Goal"}
            </Text>
            <Pressable onPress={() => { setShowModal(false); reset(); }}>
              <Feather name="x" size={24} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Preset selector — shown only for new goal */}
            {showPresets && !editingId && (
              <>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: colors.foreground,
                    marginBottom: 12,
                    fontFamily: "Inter_700Bold",
                  }}
                >
                  What are you saving for?
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
                  {GOAL_PRESETS.map((p) => (
                    <Pressable
                      key={p.label}
                      onPress={() => selectPreset(p)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: colors.border,
                        backgroundColor: colors.secondary,
                      }}
                    >
                      <Text style={{ fontSize: 20 }}>{p.emoji}</Text>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                        {p.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 20 }} />
              </>
            )}

            {/* Emoji picker */}
            {!showPresets && (
              <>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: colors.mutedForeground,
                    marginBottom: 10,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Icon
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {GOAL_EMOJIS.map((e) => (
                    <Pressable
                      key={e}
                      onPress={() => setEmoji(e)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: emoji === e ? colors.primary : colors.border,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: emoji === e ? colors.accent : colors.secondary,
                      }}
                    >
                      <Text style={{ fontSize: 22 }}>{e}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <Input
              label="Goal Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. My Dream Car"
            />

            <Input
              label="Description (optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="What exactly are you buying / planning?"
            />

            <Input
              label="Target Amount"
              value={targetAmount}
              onChangeText={setTargetAmount}
              placeholder="800000"
              keyboardType="decimal-pad"
              prefix="₹"
            />

            <Input
              label="Already Saved"
              value={savedAmount}
              onChangeText={setSavedAmount}
              placeholder="0"
              keyboardType="decimal-pad"
              prefix="₹"
            />

            {/* Target Date */}
            <Input
              label="Target Date — When do you want to buy?"
              value={targetDate}
              onChangeText={setTargetDate}
              placeholder="YYYY-MM-DD  (e.g. 2025-12-31)"
            />

            {/* Live monthly savings estimate */}
            {targetDate && targetAmount && parseFloat(targetAmount) > 0 && (() => {
              const days = daysUntil(targetDate);
              if (!days || days <= 0) return null;
              const remaining = parseFloat(targetAmount) - (parseFloat(savedAmount) || 0);
              if (remaining <= 0) return null;
              const months = Math.max(days / 30, 0.5);
              const monthly = Math.ceil(remaining / months);
              return (
                <View
                  style={{
                    backgroundColor: colors.primary + "12",
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: colors.primary + "30",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Feather name="trending-up" size={18} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "700" }}>
                      {formatCurrency(monthly)}/month needed
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
                      to reach your goal in {days} days ({Math.round(months)} months)
                    </Text>
                  </View>
                </View>
              );
            })()}

            <View style={{ height: 16 }} />
            <Button
              title={editingId ? "Save Changes" : "Create Goal"}
              onPress={save}
              disabled={!name.trim() || !targetAmount}
            />
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({});
