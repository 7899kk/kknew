import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProFinancierHeader } from "@/components/ProFinancierHeader";
import {
  Button,
  Card,
  Input,
  PillSelector,
  formatCurrencyFull,
} from "@/components/UI";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { loanSchema } from "@/utils/ledgerSchema";
import type { Loan } from "@/utils/ledgerSchema";
import { loanSummary } from "@/utils/loans";
import { localDate, validDate, validMoney } from "@/utils/financeValidation";
import { confirmAction } from "@/utils/dialogs";
export default function LoansScreen() {
  const app = useApp(),
    c = useColors(),
    insets = useSafeAreaInsets(),
    params = useLocalSearchParams<{ loanId?: string }>();
  const [selected, setSelected] = useState<string | null>(null),
    [form, setForm] = useState(false),
    [editing, setEditing] = useState<string | null>(null),
    [paying, setPaying] = useState(false);
  const [name, setName] = useState(""),
    [party, setParty] = useState(""),
    [kind, setKind] = useState("Borrowed"),
    [principal, setPrincipal] = useState(""),
    [monthly, setMonthly] = useState(""),
    [due, setDue] = useState(localDate()),
    [amount, setAmount] = useState(""),
    [paidDate, setPaidDate] = useState(localDate()),
    [activityId, setActivityId] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    if (params.loanId) setSelected(params.loanId);
  }, [params.loanId]);
  const loan = app.loans.find((l) => l.id === selected),
    summary = loan ? loanSummary(loan) : null;
  const open = (l?: Loan) => {
    setEditing(l?.id || null);
    setName(l?.name || "");
    setParty(l?.party || "");
    setKind(l?.kind === "lent" ? "Lent" : "Borrowed");
    setPrincipal(l ? String(l.principal) : "");
    setMonthly(l ? String(l.monthlyPayment) : "");
    setDue(l?.firstDueDate || localDate());
    setError("");
    setForm(true);
  };
  const save = () => {
    const data = {
      name: name.trim(),
      party: party.trim(),
      kind: kind === "Borrowed" ? ("borrowed" as const) : ("lent" as const),
      principal: Number(principal),
      monthlyPayment: Number(monthly),
      firstDueDate: due,
    };
    const existing = app.loans.find((l) => l.id === editing);
    const checked = loanSchema.safeParse({
      ...data,
      id: editing || "new",
      payments: existing?.payments || [],
    });
    if (!validMoney(principal) || !validMoney(monthly) || !checked.success) {
      setError(
        checked.success
          ? "Enter positive amounts."
          : checked.error.issues[0]?.message || "Check loan details.",
      );
      return;
    }
    editing ? app.updateLoan(editing, data) : app.addLoan(data);
    setForm(false);
  };
  const record = () => {
    if (
      !loan ||
      !summary ||
      !validMoney(amount) ||
      !validDate(paidDate) ||
      paidDate > localDate() ||
      Number(amount) > summary.remaining
    ) {
      setError("Enter an amount within the balance and a date up to today.");
      return;
    }
    app.recordLoanPayment(loan.id, {
      amount: Number(amount),
      date: paidDate,
      activityId: activityId || undefined,
    });
    setPaying(false);
  };
  const matchedIds = new Set(
    app.loans.flatMap((l) =>
      l.payments.map((p) => p.activityId).filter(Boolean),
    ),
  );
  const matches = loan
    ? (loan.kind === "borrowed" ? app.expenses : app.incomes).filter(
        (t) => !matchedIds.has(t.id) && t.amount === Number(amount),
      )
    : [];
  const cardTitle = (text: string) => (
    <Text
      style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: c.foreground }}
    >
      {text}
    </Text>
  );
  const metric = (label: string, value: number) => (
    <View style={{ flex: 1, gap: 5 }}>
      <Text style={{ color: c.mutedForeground, fontSize: 12 }}>{label}</Text>
      <Text
        style={{
          color: c.foreground,
          fontSize: 23,
          fontFamily: "Inter_700Bold",
        }}
      >
        {formatCurrencyFull(value)}
      </Text>
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ProFinancierHeader title="Loans" />
      <ScrollView
        contentContainerStyle={{
          padding: 18,
          paddingBottom: insets.bottom + 110,
          gap: 14,
        }}
      >
        <Card>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {metric("Monthly payments", app.monthlyLoanPayments)}
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
                Loans
              </Text>
              <Text
                style={{
                  color: c.foreground,
                  fontSize: 23,
                  fontFamily: "Inter_700Bold",
                }}
              >
                {app.loans.length}
              </Text>
            </View>
          </View>
        </Card>
        <Button title="Add loan" icon="plus" onPress={() => open()} />
        {!app.loans.length && (
          <Text
            style={{
              color: c.mutedForeground,
              textAlign: "center",
              padding: 30,
            }}
          >
            No loans yet
          </Text>
        )}
        {app.loans.map((l) => {
          const s = loanSummary(l);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open loan ${l.name}`}
              key={l.id}
              onPress={() => setSelected(l.id)}
            >
              <Card>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 43,
                      height: 43,
                      borderRadius: 14,
                      backgroundColor: c.goldLight,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather
                      name="credit-card"
                      size={19}
                      color={c.foreground}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    {cardTitle(l.name)}
                    <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
                      {l.party} ·{" "}
                      {l.kind === "borrowed" ? "You repay" : "Owed to you"}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 18,
                      color: c.foreground,
                      fontFamily: "Inter_700Bold",
                    }}
                  >
                    {formatCurrencyFull(s.remaining)}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: 15,
                  }}
                >
                  <Text
                    style={{
                      color: s.overdue > 0 ? c.destructive : c.mutedForeground,
                      fontSize: 13,
                    }}
                  >
                    {s.next ? `Due ${s.next.date}` : "Repaid"}
                  </Text>
                  <Text style={{ color: c.foreground, fontSize: 13 }}>
                    {formatCurrencyFull(l.monthlyPayment)}/month
                  </Text>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
      <Modal
        visible={!!loan && !form && !paying}
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 24,
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 30,
            flexGrow: 1,
            gap: 16,
            backgroundColor: c.background,
          }}
        >
          {loan && summary && (
            <>
              {cardTitle(loan.name)}
              <Text style={{ color: c.mutedForeground }}>
                {loan.party} · {loan.kind === "borrowed" ? "Borrowed" : "Lent"}
              </Text>
              <Card>
                {metric("Balance to repay", summary.remaining)}
                <Text style={{ color: c.foreground, marginTop: 14 }}>
                  {formatCurrencyFull(loan.monthlyPayment)} monthly
                </Text>
                <Text
                  style={{
                    color:
                      summary.overdue > 0 ? c.destructive : c.mutedForeground,
                    marginTop: 8,
                  }}
                >
                  {summary.next
                    ? `Next due ${summary.next.date}`
                    : "Fully repaid"}
                </Text>
                {summary.overdue > 0 && (
                  <Text style={{ color: c.destructive, marginTop: 8 }}>
                    Overdue {formatCurrencyFull(summary.overdue)}
                  </Text>
                )}
              </Card>
              {summary.remaining > 0 && (
                <Button
                  title="Record repayment"
                  onPress={() => {
                    setError("");
                    setAmount(
                      String(
                        Math.min(
                          summary.remaining,
                          summary.next?.remaining || loan.monthlyPayment,
                        ),
                      ),
                    );
                    setPaidDate(localDate());
                    setActivityId("");
                    setPaying(true);
                  }}
                />
              )}
              <Button
                title="Edit loan"
                variant="secondary"
                onPress={() => open(loan)}
              />
              {cardTitle("Payments")}
              {loan.payments.length ? (
                loan.payments.map((p) => (
                  <Card key={p.id}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text style={{ color: c.foreground }}>
                        {formatCurrencyFull(p.amount)}
                      </Text>
                      <Text style={{ color: c.mutedForeground }}>{p.date}</Text>
                    </View>
                    <Text
                      style={{
                        color: c.mutedForeground,
                        fontSize: 12,
                        marginTop: 6,
                      }}
                    >
                      {p.activityId
                        ? "Matched in Activity"
                        : "Dues record · cash tracked separately"}
                    </Text>
                    <Button
                      title="Undo repayment"
                      variant="ghost"
                      onPress={() =>
                        confirmAction(
                          "Undo repayment?",
                          "This updates the loan and dues. Activity stays unchanged.",
                          () => app.deleteLoanPayment(loan.id, p.id),
                        )
                      }
                    />
                  </Card>
                ))
              ) : (
                <Text style={{ color: c.mutedForeground }}>
                  No repayments yet
                </Text>
              )}
              <Button
                title="Delete loan"
                variant="ghost"
                onPress={() =>
                  confirmAction(
                    "Delete loan?",
                    "Remove the loan and its dues history? Activity transactions stay unchanged.",
                    () => {
                      app.deleteLoan(loan.id);
                      setSelected(null);
                    },
                  )
                }
              />
            </>
          )}
          <Button
            title="Close"
            variant="secondary"
            onPress={() => setSelected(null)}
          />
        </ScrollView>
      </Modal>
      <Modal
        visible={form || paying}
        animationType="slide"
        onRequestClose={() => {
          setForm(false);
          setPaying(false);
        }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: 24,
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 30,
            backgroundColor: c.background,
            flexGrow: 1,
            gap: 12,
          }}
        >
          {cardTitle(
            paying ? "Record repayment" : editing ? "Edit loan" : "Add loan",
          )}
          {paying ? (
            <>
              <Input
                label="Payment amount"
                value={amount}
                onChangeText={(v) => {
                  setAmount(v);
                  setActivityId("");
                }}
                keyboardType="decimal-pad"
                prefix="₹"
              />
              <Input
                label="Payment date"
                value={paidDate}
                onChangeText={(v) => {
                  setPaidDate(v);
                  setActivityId("");
                }}
                placeholder="YYYY-MM-DD"
              />
              <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                Updates dues. Cash is tracked separately in Activity.
              </Text>
              {matches.length > 0 && (
                <>
                  <Text style={{ color: c.foreground }}>
                    Match an Activity transaction
                  </Text>
                  <Button
                    title="No match"
                    variant={activityId ? "secondary" : "primary"}
                    onPress={() => setActivityId("")}
                  />
                  {matches.slice(0, 30).map((t) => (
                    <Button
                      key={t.id}
                      title={`${t.date} · ${"name" in t ? t.name || "Income" : t.notes || "Payment"}`}
                      variant={activityId === t.id ? "primary" : "secondary"}
                      onPress={() => {
                        setActivityId(t.id);
                        setPaidDate(t.date);
                      }}
                    />
                  ))}
                </>
              )}
            </>
          ) : (
            <>
              <PillSelector
                options={["Borrowed", "Lent"]}
                value={kind}
                onChange={setKind}
              />
              <Input
                label="Loan name"
                value={name}
                onChangeText={setName}
                placeholder="Home loan"
              />
              <Input
                label={kind === "Borrowed" ? "Lender" : "Borrower"}
                value={party}
                onChangeText={setParty}
              />
              <Input
                label="Total balance to repay"
                value={principal}
                onChangeText={setPrincipal}
                keyboardType="decimal-pad"
                prefix="₹"
              />
              <Input
                label="Monthly payment"
                value={monthly}
                onChangeText={setMonthly}
                keyboardType="decimal-pad"
                prefix="₹"
              />
              <Input
                label="First payment due"
                value={due}
                onChangeText={setDue}
                placeholder="YYYY-MM-DD"
              />
            </>
          )}
          {!!error && (
            <Text accessibilityRole="alert" style={{ color: c.destructive }}>
              {error}
            </Text>
          )}
          <Button
            title={paying ? "Save repayment" : "Save loan"}
            onPress={paying ? record : save}
          />
          <Button
            title="Cancel"
            variant="ghost"
            onPress={() => {
              setForm(false);
              setPaying(false);
            }}
          />
        </ScrollView>
      </Modal>
    </View>
  );
}
