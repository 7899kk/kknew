import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp, type DebtEntry } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { ProFinancierHeader } from "@/components/ProFinancierHeader";
import {
  Button,
  Card,
  Input,
  PillSelector,
  formatCurrencyFull,
} from "@/components/UI";
import { validMoney, validDate } from "@/utils/financeValidation";
import { confirmAction } from "@/utils/dialogs";
import type { Obligation } from "@/utils/obligations";
import { localGroupMember } from "@/utils/obligations";
export default function DebtsScreen() {
  const app = useApp(),
    c = useColors(),
    insets = useSafeAreaInsets();
  const [tab, setTab] = useState("You owe"),
    [status, setStatus] = useState("Open"),
    [form, setForm] = useState(false),
    [editing, setEditing] = useState<string | null>(null),
    [name, setName] = useState(""),
    [amount, setAmount] = useState(""),
    [due, setDue] = useState(""),
    [type, setType] = useState("You owe"),
    [entryStatus, setEntryStatus] = useState("Pending"),
    [error, setError] = useState("");
  const rows = app.obligations.filter(
    (d) =>
      (tab === "You owe" ? d.type === "debit" : d.type === "credit") &&
      (status === "Open" ? d.status === "Pending" : d.status === "Paid"),
  );
  const open = (d?: DebtEntry) => {
    setEditing(d?.id || null);
    setName(d?.name || "");
    setAmount(d ? String(d.amount) : "");
    setDue(d?.dueDate || "");
    setType(d?.type === "credit" ? "Owed to you" : d ? "You owe" : tab);
    setEntryStatus(d?.status || "Pending");
    setError("");
    setForm(true);
  };
  const view = (d: Obligation) => {
    if (d.sourceKind)
      router.push({
        pathname:
          d.sourceKind === "loan" ? "/(tabs)/loans" : "/(tabs)/billsplit",
        params:
          d.sourceKind === "loan"
            ? { loanId: d.sourceId }
            : { groupId: d.sourceId },
      } as Href);
    else open(d);
  };
  const save = () => {
    if (!name.trim() || !validMoney(amount) || !validDate(due, true)) {
      setError("Enter a name, positive amount and valid due date.");
      return;
    }
    const data = {
      name: name.trim(),
      amount: Number(amount),
      dueDate: due || undefined,
      type: type === "You owe" ? ("debit" as const) : ("credit" as const),
      status: entryStatus as "Pending" | "Paid",
    };
    editing ? app.updateDebt(editing, data) : app.addDebt(data);
    setForm(false);
  };
  const unlinked = app.billGroups.filter(
    (g) => !localGroupMember(g, app.groupMemberships, app.profile),
  ).length;
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ProFinancierHeader title="Debts & credits" />
      <ScrollView
        contentContainerStyle={{
          padding: 18,
          paddingBottom: insets.bottom + 110,
          gap: 13,
        }}
      >
        <View style={{ flexDirection: "row", gap: 12 }}>
          {[
            { label: "You owe", amount: app.totalDebt },
            { label: "Owed to you", amount: app.totalCredit },
          ].map((m) => (
            <Card key={m.label} style={{ flex: 1 }}>
              <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
                {m.label}
              </Text>
              <Text
                style={{
                  color: c.foreground,
                  fontSize: 25,
                  fontFamily: "Inter_700Bold",
                  marginTop: 10,
                }}
              >
                {formatCurrencyFull(m.amount)}
              </Text>
            </Card>
          ))}
        </View>
        <PillSelector
          options={["You owe", "Owed to you"]}
          value={tab}
          onChange={setTab}
        />
        <PillSelector
          options={["Open", "Paid"]}
          value={status}
          onChange={setStatus}
        />
        <Button title="Add entry" icon="plus" onPress={() => open()} />
        {unlinked > 0 && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(tabs)/billsplit" as Href)}
          >
            <Card>
              <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                Choose your name in {unlinked} bill{" "}
                {unlinked === 1 ? "group" : "groups"} to link your share →
              </Text>
            </Card>
          </Pressable>
        )}
        {rows.map((d) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${d.name} ${d.sourceLabel || "entry"}`}
            onPress={() => view(d)}
            key={d.id}
          >
            <Card>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View
                  style={{
                    width: 39,
                    height: 39,
                    borderRadius: 12,
                    backgroundColor:
                      d.sourceKind === "loan" ? c.goldLight : c.successLight,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather
                    name={
                      d.sourceKind === "split"
                        ? "users"
                        : d.sourceKind === "loan"
                          ? "credit-card"
                          : "repeat"
                    }
                    size={18}
                    color={c.foreground}
                  />
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text
                    style={{
                      color: c.foreground,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 15,
                    }}
                  >
                    {d.name}
                  </Text>
                  <Text style={{ color: c.mutedForeground, fontSize: 11 }}>
                    {d.sourceLabel || "Personal entry"}
                    {d.dueDate
                      ? ` · ${d.status === "Paid" ? "Paid" : "Due"} ${d.dueDate}`
                      : ""}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 5 }}>
                  <Text
                    style={{
                      color: d.type === "credit" ? c.income : c.expense,
                      fontFamily: "Inter_700Bold",
                      fontSize: 17,
                    }}
                  >
                    {formatCurrencyFull(d.amount)}
                  </Text>
                  <Text style={{ fontSize: 10, color: c.mutedForeground }}>
                    {d.status}
                  </Text>
                </View>
              </View>
            </Card>
          </Pressable>
        ))}
        {!rows.length && (
          <Text
            style={{
              color: c.mutedForeground,
              textAlign: "center",
              padding: 25,
            }}
          >
            No {status === "Open" ? "open" : "paid"} entries
          </Text>
        )}
      </ScrollView>
      <Modal
        visible={form}
        animationType="slide"
        onRequestClose={() => setForm(false)}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: 24,
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 30,
            flexGrow: 1,
            gap: 13,
            backgroundColor: c.background,
          }}
        >
          <Text
            style={{
              color: c.foreground,
              fontFamily: "Inter_700Bold",
              fontSize: 24,
            }}
          >
            {editing ? "Edit entry" : "Add entry"}
          </Text>
          <PillSelector
            options={["You owe", "Owed to you"]}
            value={type}
            onChange={setType}
          />
          <Input
            label="Person or institution"
            value={name}
            onChangeText={setName}
          />
          <Input
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            prefix="₹"
          />
          <Input
            label="Due date (optional)"
            value={due}
            onChangeText={setDue}
            placeholder="YYYY-MM-DD"
          />
          <PillSelector
            options={["Pending", "Paid"]}
            value={entryStatus}
            onChange={setEntryStatus}
          />
          {!!error && <Text style={{ color: c.destructive }}>{error}</Text>}
          <Button title="Save entry" onPress={save} />
          {editing && (
            <Button
              title="Delete entry"
              variant="ghost"
              onPress={() =>
                confirmAction(
                  "Delete entry?",
                  "Remove this personal entry?",
                  () => {
                    app.deleteDebt(editing);
                    setForm(false);
                  },
                )
              }
            />
          )}
          <Button
            title="Cancel"
            variant="ghost"
            onPress={() => setForm(false)}
          />
        </ScrollView>
      </Modal>
    </View>
  );
}
