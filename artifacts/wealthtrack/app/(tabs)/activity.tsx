import { Pressable } from "react-native";
import { router, type Href } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { TrackingSettings } from "@/components/TrackingSettings";
import { transactionDateLabel } from "@/utils/transactionDetails";
import { validMoney, validDate } from "@/utils/financeValidation";
import React, { useState } from "react";
import { Alert, Modal, ScrollView, FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp, Expense, ExpenseCategory } from "@/context/AppContext";
import {
  Button,
  Card,
  Input,
  PillSelector,
  formatCurrencyFull,
} from "@/components/UI";
import { ProFinancierHeader } from "@/components/ProFinancierHeader";
import { sourceNames } from "@/utils/notificationBridge";

import { debitReasonDetails, expenseCategories } from "@/utils/debitReasons";

type Editing = {
  id?: string;
  kind: "expense" | "income" | "review";
  amount: string;
  notes: string;
  date: string;
  name?: string;
  category?: string;
};
export default function ActivityScreen() {
  const app = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [reviewKind, setReviewKind] = useState("Expense");
  const save = () => {
    if (!editing) return;
    const amount = Number(editing.amount);
    if (!validMoney(editing.amount) || !validDate(editing.date)) {
      Alert.alert(
        "Check entry",
        "Enter a positive amount and valid date (YYYY-MM-DD).",
      );
      return;
    }
    if (editing.kind === "review" && editing.id)
      app.resolvePayment(
        editing.id,
        reviewKind === "Income" ? "income" : "expense",
        amount,
        {
          name: editing.name,
          category: editing.category,
          notes: editing.notes,
        },
      );
    else if (editing.kind === "income") {
      const data = {
        amount,
        date: editing.date,
        notes: editing.notes,
        name: editing.name?.trim() || "Money received",
        category: editing.category || "Uncategorized",
      };
      editing.id ? app.updateIncome(editing.id, data) : app.addIncome(data);
    } else if (editing.id) {
      const original = app.expenses.find((item) => item.id === editing.id);
      const details = debitReasonDetails(
        editing.notes,
        (editing.category || "Others") as ExpenseCategory,
      );
      if (original?.needsReason && !details) {
        Alert.alert(
          "Add a reason",
          "Enter a reason between 1 and 200 characters.",
        );
        return;
      }
      app.updateExpense(editing.id, {
        amount,
        date: editing.date,
        notes: editing.notes,
        category: (editing.category || "Others") as ExpenseCategory,
        ...(details || {}),
      });
    }
    setEditing(null);
  };
  const remove = (id: string, kind: "expense" | "income") =>
    Alert.alert(
      "Delete entry?",
      "This removes the entry from your totals. A captured notification will not be imported again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            kind === "income" ? app.deleteIncome(id) : app.deleteExpense(id),
        },
      ],
    );
  const rows = [
    ...app.expenses.map((e) => ({ ...e, kind: "expense" as const })),
    ...app.incomes.map((e) => ({ ...e, kind: "income" as const })),
  ].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || (b.timestamp || 0) - (a.timestamp || 0),
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ProFinancierHeader title="Activity" rightSlot={<TrackingSettings />} />
      <FlatList
        data={
          filter === "Dues"
            ? []
            : rows.filter(
                (e) =>
                  (filter === "All" ||
                    (filter === "Income"
                      ? e.kind === "income"
                      : e.kind === "expense")) &&
                  `${e.notes || ""} ${e.category || ""} ${"name" in e ? e.name || "" : ""}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
              )
        }
        keyExtractor={(e) => `${e.kind}-${e.id}`}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 100 + insets.bottom,
          gap: 16,
        }}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={7}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <Input
              hideLabel
              label="Search transactions"
              placeholder="Search transactions"
              value={search}
              onChangeText={setSearch}
            />

            {!!app.storageError && (
              <Card>
                <Text style={{ color: colors.destructive }}>
                  {app.storageError}
                </Text>
                <Button
                  title="Retry saving"
                  variant="secondary"
                  onPress={app.retrySave}
                />
              </Card>
            )}
            {app.paymentReviews.length > 0 && (
              <Card>
                <Text
                  style={{
                    color: colors.foreground,
                    fontSize: 18,
                    fontWeight: "700",
                  }}
                >
                  Needs review ({app.paymentReviews.length})
                </Text>
                {app.paymentReviews.map((e) => (
                  <View
                    key={e.id}
                    style={{
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderColor: colors.border,
                      gap: 8,
                    }}
                  >
                    <Text style={{ color: colors.foreground, fontSize: 16 }}>
                      {formatCurrencyFull(e.amount)} ·{" "}
                      {sourceNames[e.source] || e.source}
                    </Text>
                    <Text
                      style={{ color: colors.mutedForeground, fontSize: 14 }}
                    >
                      {e.possibleDuplicateOf
                        ? "Possible duplicate · not in totals"
                        : e.conflict
                          ? "Conflicting payment"
                          : e.status === "transfer"
                            ? "Possible self-transfer"
                            : "Check payment"}{" "}
                      ·{" "}
                      {new Date(e.timestamp).toLocaleString("en-IN", {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </Text>
                    <Button
                      title="Review"
                      variant="secondary"
                      onPress={() => {
                        setReviewKind(
                          e.directionHint === "income" ? "Income" : "Expense",
                        );
                        const d = new Date(e.timestamp);
                        setEditing({
                          id: e.id,
                          kind: "review",
                          amount: String(e.amount),
                          notes: "",
                          date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
                        });
                      }}
                    />
                    <Button
                      title="Dismiss"
                      variant="ghost"
                      onPress={() => app.resolvePayment(e.id, "ignore")}
                    />
                  </View>
                ))}
              </Card>
            )}
            <Button
              title="Add income"
              icon="plus"
              onPress={() => {
                const d = new Date();
                setEditing({
                  kind: "income",
                  amount: "",
                  notes: "",
                  name: "",
                  category: "Other",
                  date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
                });
              }}
            />
            <PillSelector
              options={["All", "Expenses", "Income", "Dues"]}
              value={filter}
              onChange={setFilter}
            />
          </View>
        }
        ListEmptyComponent={
          filter === "Dues" ? (
            <View style={{ gap: 10 }}>
              {app.obligations.length ? (
                app.obligations.map((d) => (
                  <Pressable
                    accessibilityRole="button"
                    key={d.id}
                    onPress={() =>
                      router.push(
                        (d.sourceKind === "loan"
                          ? "/(tabs)/loans"
                          : d.sourceKind === "split"
                            ? "/(tabs)/billsplit"
                            : "/(tabs)/debts") as Href,
                      )
                    }
                  >
                    <Card>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <Text style={{ color: colors.foreground, flex: 1 }}>
                          {d.name} · {d.sourceLabel || "Personal dues"}
                        </Text>
                        <Text
                          style={{
                            color: colors.foreground,
                            fontWeight: "600",
                          }}
                        >
                          {formatCurrencyFull(d.amount)}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontSize: 11,
                          marginTop: 7,
                        }}
                      >
                        Dues record ·{" "}
                        {d.type === "debit" ? "You owe" : "Owed to you"} ·{" "}
                        {d.status}
                      </Text>
                    </Card>
                  </Pressable>
                ))
              ) : (
                <Text
                  style={{ color: colors.mutedForeground, textAlign: "center" }}
                >
                  No dues yet
                </Text>
              )}
            </View>
          ) : (
            <Text
              style={{ color: colors.mutedForeground, textAlign: "center" }}
            >
              No transactions yet.
            </Text>
          )
        }
        renderItem={({ item: e }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${e.kind} ${e.kind === "income" ? e.name || "Money received" : e.needsReason ? "Money sent" : e.notes || e.category}`}
            onPress={() =>
              setEditing({
                id: e.id,
                kind: e.kind,
                amount: String(e.amount),
                notes:
                  e.kind === "expense" && e.needsReason ? "" : e.notes || "",
                date: e.date,
                name: e.kind === "income" ? e.name : undefined,
                category: e.category,
              })
            }
          >
            <Card style={{ padding: 14 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View
                  style={{
                    height: 36,
                    width: 36,
                    borderRadius: 11,
                    backgroundColor:
                      e.kind === "income"
                        ? colors.successLight
                        : colors.goldLight,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather
                    name={
                      e.kind === "income" ? "arrow-down-left" : "arrow-up-right"
                    }
                    size={17}
                    color={colors.foreground}
                  />
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: colors.foreground,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 14,
                    }}
                  >
                    {e.kind === "income"
                      ? e.name || "Money received"
                      : e.needsReason
                        ? "Money sent"
                        : e.notes || e.category}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{ color: colors.mutedForeground, fontSize: 10 }}
                  >
                    {e.category || "Uncategorized"} ·{" "}
                    {e.source?.startsWith("Bank SMS")
                      ? "Bank SMS"
                      : e.source || "Manual"}
                  </Text>
                </View>
                <Text
                  style={{
                    color:
                      e.kind === "income" ? colors.success : colors.foreground,
                    fontFamily: "Inter_700Bold",
                    fontSize: 15,
                  }}
                >
                  {e.kind === "income" ? "+" : "−"}
                  {formatCurrencyFull(e.amount)}
                </Text>
              </View>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: 10,
                  marginTop: 9,
                }}
              >
                {transactionDateLabel(e.date, e.time)}
              </Text>
            </Card>
          </Pressable>
        )}
      />
      <Modal
        visible={!!editing}
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 24,
            paddingTop: insets.top + 24,
            backgroundColor: colors.background,
            flexGrow: 1,
            gap: 12,
          }}
        >
          <Text
            style={{
              color: colors.foreground,
              fontSize: 24,
              fontWeight: "700",
            }}
          >
            Edit transaction
          </Text>
          {editing?.kind === "review" && (
            <PillSelector
              options={["Expense", "Income"]}
              value={reviewKind}
              onChange={setReviewKind}
            />
          )}
          {(editing?.kind === "income" ||
            (editing?.kind === "review" && reviewKind === "Income")) && (
            <>
              <Input
                label="Income name"
                placeholder="Salary, gift, freelance work…"
                value={
                  editing?.name === "Money received" ? "" : editing?.name || ""
                }
                onChangeText={(name) =>
                  setEditing((e) => (e ? { ...e, name } : null))
                }
              />
              <PillSelector
                options={["Salary", "Business", "Gift", "Refund", "Other"]}
                value={editing?.category || "Uncategorized"}
                onChange={(category) =>
                  setEditing((e) =>
                    e
                      ? {
                          ...e,
                          category,
                          name:
                            !e.name || e.name === "Money received"
                              ? category
                              : e.name,
                        }
                      : null,
                  )
                }
              />
            </>
          )}
          {editing?.kind === "expense" && (
            <PillSelector
              options={expenseCategories}
              value={(editing.category || "Others") as ExpenseCategory}
              onChange={(category) =>
                setEditing((e) => (e ? { ...e, category } : null))
              }
            />
          )}
          <Input
            label="Amount (INR)"
            value={editing?.amount || ""}
            onChangeText={(amount) =>
              setEditing((e) => (e ? { ...e, amount } : null))
            }
            keyboardType="decimal-pad"
          />
          {editing?.kind !== "review" && (
            <>
              <Input
                label="Date (YYYY-MM-DD)"
                value={editing?.date || ""}
                onChangeText={(date) =>
                  setEditing((e) => (e ? { ...e, date } : null))
                }
              />
              <Input
                label={editing?.kind === "expense" ? "Payment reason" : "Notes"}
                value={editing?.notes || ""}
                onChangeText={(notes) =>
                  setEditing((e) => (e ? { ...e, notes } : null))
                }
              />
            </>
          )}
          <Button title="Save" onPress={save} />
          {editing?.id && editing.kind !== "review" && (
            <Button
              title="Delete transaction"
              variant="ghost"
              onPress={() => {
                remove(editing.id!, editing.kind as "expense" | "income");
                setEditing(null);
              }}
            />
          )}
          <Button
            title="Cancel"
            variant="ghost"
            onPress={() => setEditing(null)}
          />
        </ScrollView>
      </Modal>
    </View>
  );
}
