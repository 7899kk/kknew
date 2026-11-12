import * as Clipboard from "expo-clipboard";
import { confirmAction } from "@/utils/dialogs";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import * as Crypto from "expo-crypto";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp, BillGroup } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  Button,
  Card,
  Input,
  PillSelector,
  formatCurrencyFull,
} from "@/components/UI";
import { ProFinancierHeader } from "@/components/ProFinancierHeader";
import { calculateSettlements } from "@/utils/billSettlements";
import {
  decideProposal,
  groupSummary,
  importShared,
  parseSharedFile,
  snapshot,
} from "@/utils/groupSharing";
import { GroupProposal, groupSchema } from "@/utils/ledgerSchema";
import { localDate, validMoney } from "@/utils/financeValidation";
import { pickFile, shareFile } from "@/utils/files";

type Form = "group" | "expense" | "repayment" | null;
export default function BillSplitScreen() {
  const app = useApp(),
    colors = useColors(),
    insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string | null>(null),
    [form, setForm] = useState<Form>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [name, setName] = useState(""),
    [members, setMembers] = useState(""),
    [description, setDescription] = useState(""),
    [amount, setAmount] = useState("");
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [participants, setParticipants] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const g = app.billGroups.find((g) => g.id === selected);
  const run = async (fn: () => Promise<unknown> | unknown) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  };
  const confirm = confirmAction;
  const open = (kind: Form, a = "", b = "", value = "") => {
    setForm(kind);
    setName("");
    setMembers("");
    setError("");
    setDescription("");
    setAmount(value);
    setFrom(a || g?.members[0] || "");
    setTo(b || g?.members[1] || "");
    setParticipants(g?.members || []);
  };
  const importFile = () =>
    run(async () => {
      const raw = await pickFile();
      if (!raw) return;
      const file = parseSharedFile(raw);
      const details =
        file.type === "snapshot"
          ? `${file.group.name}: ${file.group.members.length} people and ${file.group.expenses.length} bills. This updates any older shared copy on your phone.`
          : `${file.proposal.kind === "expense" ? "Expense" : "Payment"}: ₹${(file.proposal.expense?.amount || file.proposal.repayment?.amount || 0).toFixed(2)}. You can review and approve it inside this group.`;
      confirm(
        "Open this bill update?",
        details + " Files do not verify anyone’s identity.",
        () =>
          void run(() => app.replaceGroups(importShared(app.billGroups, file))),
      );
    });
  const save = () =>
    run(async () => {
      if (form === "group") {
        const list = [
          ...new Set(
            members
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          ),
        ];
        if (!name.trim() || list.length < 2 || list.length > 100)
          throw Error(
            "Enter a group name and between 2 and 100 distinct members.",
          );
        app.addBillGroup({ name: name.trim(), members: list });
        setForm(null);
        return;
      }
      if (!g || !validMoney(amount))
        throw Error("Enter a positive amount with at most two decimal places.");
      const value = Number(amount),
        id = Crypto.randomUUID();
      if (form === "expense") {
        if (!description.trim() || !participants.length)
          throw Error("Enter a description and select participants.");
        const expense = {
          id,
          description: description.trim(),
          amount: value,
          paidBy: from,
          splitAmong: participants,
          date: localDate(),
        };
        if (g.readOnly)
          await sendProposal(g, {
            id: Crypto.randomUUID(),
            groupId: g.id,
            baseRevision: g.revision || 0,
            claimedMember: g.memberIds?.[from] || from,
            kind: "expense",
            expense,
          });
        else {
          const next = {
            ...g,
            revision: (g.revision || 0) + 1,
            expenses: [...g.expenses, expense],
          };
          groupSchema.parse(next);
          app.replaceGroup(next);
        }
      } else {
        if (from === to) throw Error("Choose different members.");
        const due =
          calculateSettlements(g).find((s) => s.from === from && s.to === to)
            ?.amount || 0;
        if (value > due)
          throw Error("Amount exceeds the current suggested settlement.");
        const repayment = { id, from, to, amount: value, date: localDate() };
        if (g.readOnly)
          await sendProposal(g, {
            id: Crypto.randomUUID(),
            groupId: g.id,
            baseRevision: g.revision || 0,
            claimedMember: g.memberIds?.[from] || from,
            kind: "repayment",
            repayment,
          });
        else {
          const next = {
            ...g,
            revision: (g.revision || 0) + 1,
            repayments: [...(g.repayments || []), repayment],
          };
          groupSchema.parse(next);
          app.replaceGroup(next);
        }
      }
      setForm(null);
    });
  async function sendProposal(group: BillGroup, p: GroupProposal) {
    const next = { ...group, proposals: [...(group.proposals || []), p] };
    groupSchema.parse(next);
    // Keep the proposal for re-sharing; it has no effect on balances.
    app.replaceGroup(next);
    await shareFile(
      `profinancer-proposal-${p.id}.json`,
      JSON.stringify({
        format: "profinancer-group",
        version: 1,
        type: "proposal",
        proposal: p,
      }),
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ProFinancierHeader title={g ? g.name : "Split bills"} />
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 110 + insets.bottom,
          gap: 12,
        }}
      >
        {!!error && <Text style={{ color: colors.destructive }}>{error}</Text>}
        <Button
          title="Open a shared bill or update"
          onPress={importFile}
          disabled={busy}
        />
        {!g ? (
          <>
            <Button title="Create group" onPress={() => open("group")} />
            {app.billGroups.map((group) => (
              <Card key={group.id}>
                <Text
                  style={{
                    color: colors.foreground,
                    fontSize: 18,
                    fontWeight: "700",
                  }}
                >
                  {group.name}
                </Text>
                <Text
                  style={{ color: colors.mutedForeground, marginVertical: 8 }}
                >
                  {group.members.join(", ")} ·{" "}
                  {group.readOnly ? "Shared with you" : "Managed by you"}
                </Text>
                <Text style={{ color: colors.foreground, marginBottom: 10 }}>
                  {group.expenses.length} bills ·{" "}
                  {calculateSettlements(group).length
                    ? formatCurrencyFull(
                        calculateSettlements(group).reduce(
                          (sum, e) => sum + Math.round(e.amount * 100),
                          0,
                        ) / 100,
                      ) + " still owed"
                    : "All settled"}
                </Text>
                <Button
                  title="Open group"
                  onPress={() => setSelected(group.id)}
                />
              </Card>
            ))}
            {!app.billGroups.length && (
              <Text style={{ color: colors.mutedForeground }}>
                No groups yet.
              </Text>
            )}
          </>
        ) : (
          <>
            <Button
              title="Back to groups"
              variant="ghost"
              onPress={() => setSelected(null)}
            />
            <Text style={{ color: colors.foreground }}>
              {g.members.join(" · ")}
            </Text>
            <Button
              title="View group summary"
              disabled={busy}
              onPress={() => setSummaryOpen(true)}
            />
            {!g.readOnly && (
              <Button
                title="Share group with friends"
                disabled={busy}
                onPress={() =>
                  confirm(
                    "Share this group?",
                    "The file contains group member names, expenses and repayment history. Your personal ledger is excluded.",
                    () =>
                      void run(() =>
                        shareFile(
                          `profinancer-group-${g.id}.json`,
                          JSON.stringify(snapshot(g)),
                        ),
                      ),
                  )
                }
              />
            )}
            <Button
              title={
                g.readOnly ? "Send an expense for approval" : "Add expense"
              }
              onPress={() => open("expense")}
            />
            <Button
              title={
                g.readOnly
                  ? "Send a payment for approval"
                  : "Record partial repayment"
              }
              onPress={() => open("repayment")}
            />
            <Card>
              <Text
                style={{
                  color: colors.foreground,
                  fontWeight: "700",
                  fontSize: 18,
                }}
              >
                Who owes whom
              </Text>
              {calculateSettlements(g).map((s, i) => (
                <View key={i} style={{ gap: 8, marginTop: 14 }}>
                  <Text style={{ color: colors.foreground }}>
                    {s.from} → {s.to}: {formatCurrencyFull(s.amount)}
                  </Text>
                  <Button
                    title={g.readOnly ? "Report paid" : "Mark as paid"}
                    variant="secondary"
                    onPress={() =>
                      open("repayment", s.from, s.to, String(s.amount))
                    }
                  />
                </View>
              ))}
              {!calculateSettlements(g).length && (
                <Text style={{ color: colors.success, marginTop: 12 }}>
                  All settled.
                </Text>
              )}
              <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>
                Records only · no money transfers
              </Text>
            </Card>
            {(g.proposals || []).map((p) => (
              <Card key={p.id}>
                <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                  {g.readOnly
                    ? "Waiting for the group owner"
                    : "Needs approval"}
                  : {p.kind}
                </Text>
                <Text style={{ color: colors.foreground, marginVertical: 8 }}>
                  {p.kind === "expense"
                    ? `${p.expense?.description} · paid by ${p.expense?.paidBy} · split among ${p.expense?.splitAmong.join(", ")}`
                    : `${p.repayment?.from} → ${p.repayment?.to}`}{" "}
                  ·{" "}
                  {formatCurrencyFull(
                    p.expense?.amount || p.repayment?.amount || 0,
                  )}
                </Text>
                {g.readOnly ? (
                  <Button
                    title="Send this update again"
                    onPress={() =>
                      void run(() =>
                        shareFile(
                          `profinancer-proposal-${p.id}.json`,
                          JSON.stringify({
                            format: "profinancer-group",
                            version: 1,
                            type: "proposal",
                            proposal: p,
                          }),
                        ),
                      )
                    }
                  />
                ) : (
                  <>
                    <Text style={{ color: colors.mutedForeground }}>
                      Sent as:{" "}
                      {Object.entries(g.memberIds || {}).find(
                        ([, id]) => id === p.claimedMember,
                      )?.[0] || p.claimedMember}
                      . Choose payer:
                    </Text>
                    <PillSelector
                      options={g.members}
                      value={mapping[p.id] || ""}
                      onChange={(v) => setMapping((m) => ({ ...m, [p.id]: v }))}
                    />
                    <Button
                      title="Approve update"
                      disabled={!mapping[p.id]}
                      onPress={() =>
                        confirm(
                          "Approve this update?",
                          "Check the amount, payer and participants with your friend. This changes the group balance.",
                          () =>
                            void run(() =>
                              app.replaceGroup(
                                decideProposal(g, p, true, mapping[p.id]),
                              ),
                            ),
                        )
                      }
                    />
                    <Button
                      title="Decline update"
                      variant="ghost"
                      onPress={() =>
                        void run(() =>
                          app.replaceGroup(decideProposal(g, p, false, "")),
                        )
                      }
                    />
                  </>
                )}
              </Card>
            ))}
            <Text
              style={{
                color: colors.foreground,
                fontSize: 18,
                fontWeight: "700",
              }}
            >
              Repayment history
            </Text>
            {(g.repayments || []).map((r) => (
              <Card key={r.id}>
                <Text style={{ color: colors.foreground }}>
                  {r.from} → {r.to}: {formatCurrencyFull(r.amount)} · {r.date}
                  {r.reversedAt ? " · Reversed" : ""}
                </Text>
                {!g.readOnly && !r.reversedAt && (
                  <Button
                    title="Reverse incorrect repayment"
                    variant="ghost"
                    onPress={() =>
                      confirm(
                        "Reverse repayment?",
                        "The original record stays in history and the amount becomes owed again.",
                        () =>
                          app.replaceGroup({
                            ...g,
                            revision: (g.revision || 0) + 1,
                            repayments: g.repayments?.map((x) =>
                              x.id === r.id
                                ? { ...x, reversedAt: new Date().toISOString() }
                                : x,
                            ),
                          }),
                      )
                    }
                  />
                )}
              </Card>
            ))}
            <Text
              style={{
                color: colors.foreground,
                fontSize: 18,
                fontWeight: "700",
              }}
            >
              Expenses
            </Text>
            {g.expenses.map((e) => (
              <Card key={e.id}>
                <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                  {e.description} · {formatCurrencyFull(e.amount)}
                </Text>
                <Text
                  style={{ color: colors.mutedForeground, marginVertical: 8 }}
                >
                  {e.paidBy} paid · {e.date} · Split among{" "}
                  {e.splitAmong.join(", ")}
                </Text>
                {!g.readOnly && (
                  <Button
                    title="Delete expense"
                    variant="ghost"
                    onPress={() =>
                      confirm(
                        "Delete this expense?",
                        "Existing repayment records will remain and settlements will be recalculated.",
                        () => app.deleteBillExpense(g.id, e.id),
                      )
                    }
                  />
                )}
              </Card>
            ))}
            <Button
              title={g.readOnly ? "Remove shared copy" : "Delete group"}
              variant="ghost"
              onPress={() =>
                confirm(
                  "Remove group?",
                  "This removes this phone’s group records. Shared files on other phones remain.",
                  () => {
                    app.deleteBillGroup(g.id);
                    setSelected(null);
                  },
                )
              }
            />
          </>
        )}
      </ScrollView>
      <Modal
        visible={summaryOpen && !!g}
        animationType="slide"
        onRequestClose={() => setSummaryOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <ProFinancierHeader
            title="Group summary"
            subtitle={g?.name || "Shared bills"}
          />
          <ScrollView
            contentContainerStyle={{
              padding: 16,
              paddingBottom: insets.bottom + 24,
              gap: 16,
            }}
          >
            <Card>
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 18,
                  fontWeight: "700",
                }}
              >
                {g?.name}
              </Text>
              <Text
                style={{ color: colors.mutedForeground, marginVertical: 10 }}
              >
                {g?.members.join(", ")}
              </Text>
              <Text style={{ color: colors.foreground }}>
                Total bills:{" "}
                {formatCurrencyFull(
                  (g?.expenses || []).reduce(
                    (sum, e) => sum + Math.round(e.amount * 100),
                    0,
                  ) / 100,
                )}
              </Text>
            </Card>
            {g &&
              calculateSettlements(g).map((e, i) => (
                <Card key={i}>
                  <Text style={{ color: colors.foreground, fontSize: 16 }}>
                    {e.from} owes {e.to} {formatCurrencyFull(e.amount)}
                  </Text>
                </Card>
              ))}
            {g && !calculateSettlements(g).length && (
              <Text style={{ color: colors.success, fontWeight: "700" }}>
                Everyone is settled up.
              </Text>
            )}
            <Text style={{ color: colors.mutedForeground }}>
              Recorded payments are confirmed by the group owner. This app does
              not transfer money.
            </Text>
            <Button
              title="Share summary"
              onPress={() =>
                void run(() =>
                  Share.share({ message: g ? groupSummary(g) : "" }),
                )
              }
            />
            <Button
              title="Copy summary"
              variant="secondary"
              onPress={() =>
                void run(async () => {
                  await Clipboard.setStringAsync(g ? groupSummary(g) : "");
                  setSummaryOpen(false);
                })
              }
            />
            <Button
              title="Back to group"
              variant="ghost"
              onPress={() => setSummaryOpen(false)}
            />
          </ScrollView>
        </View>
      </Modal>
      <Modal
        visible={!!form}
        animationType="slide"
        onRequestClose={() => setForm(null)}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
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
            {form === "group"
              ? "Create group"
              : form === "expense"
                ? "Expense"
                : "Record repayment"}
          </Text>
          {form === "group" ? (
            <>
              <Input label="Group name" value={name} onChangeText={setName} />
              <Input
                label="Members, separated by commas"
                placeholder="Arun, Priya, Karthik"
                value={members}
                onChangeText={setMembers}
              />
            </>
          ) : (
            <>
              {form === "expense" && (
                <Input
                  label="Description"
                  value={description}
                  onChangeText={setDescription}
                />
              )}
              <Input
                label="Amount (INR)"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
              <Text style={{ color: colors.foreground }}>
                {form === "expense" ? "Paid by" : "Paid from"}
              </Text>
              <PillSelector
                options={g?.members || []}
                value={from}
                onChange={setFrom}
              />
              {form === "repayment" ? (
                <>
                  <Text style={{ color: colors.foreground }}>Paid to</Text>
                  <PillSelector
                    options={g?.members || []}
                    value={to}
                    onChange={setTo}
                  />
                  <Text style={{ color: colors.mutedForeground }}>
                    Record only money actually repaid. Nothing is transferred by
                    this app.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={{ color: colors.foreground }}>
                    Split equally among (tap to include/exclude)
                  </Text>
                  {g?.members.map((m) => (
                    <Button
                      key={m}
                      title={`${participants.includes(m) ? "✓ " : ""}${m}`}
                      variant="secondary"
                      onPress={() =>
                        setParticipants((v) =>
                          v.includes(m) ? v.filter((x) => x !== m) : [...v, m],
                        )
                      }
                    />
                  ))}
                </>
              )}
            </>
          )}
          {!!error && (
            <Text style={{ color: colors.destructive }}>{error}</Text>
          )}
          <Button
            title={
              g?.readOnly && form !== "group"
                ? "Save and send to group owner"
                : "Save"
            }
            disabled={busy}
            onPress={save}
          />
          <Button
            title="Cancel"
            variant="ghost"
            onPress={() => setForm(null)}
          />
        </ScrollView>
      </Modal>
    </View>
  );
}
