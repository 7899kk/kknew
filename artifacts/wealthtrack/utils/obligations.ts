import type { BillGroup, DebtEntry, UserProfile } from "../context/AppContext";
import type { Loan } from "./ledgerSchema";
import { calculateSettlements } from "./billSettlements";
import { loanSummary } from "./loans";
export type Obligation = DebtEntry & {
  sourceKind?: "split" | "loan";
  sourceId?: string;
  sourceLabel?: string;
};
export function localGroupMember(
  group: BillGroup,
  memberships: Record<string, string>,
  profile: Pick<UserProfile, "name" | "username">,
) {
  const selected = memberships[group.id];
  if (selected && group.members.includes(selected)) return selected;
  const names = [profile.name, profile.username]
    .filter(Boolean)
    .map((n) => n.trim().toLowerCase());
  const matches = group.members.filter((n) =>
    names.includes(n.trim().toLowerCase()),
  );
  return matches.length === 1 ? matches[0] : undefined;
}
export function linkedObligations(state: {
  debts: DebtEntry[];
  billGroups: BillGroup[];
  profile: UserProfile;
  groupMemberships?: Record<string, string>;
  loans?: Loan[];
}): Obligation[] {
  const rows: Obligation[] = [...state.debts];
  for (const group of state.billGroups) {
    const self = localGroupMember(
      group,
      state.groupMemberships || {},
      state.profile,
    );
    if (!self) continue;
    for (const item of calculateSettlements(group)) {
      if (item.from !== self && item.to !== self) continue;
      rows.push({
        id: `split:${group.id}:${item.from}:${item.to}`,
        name: item.from === self ? item.to : item.from,
        amount: item.amount,
        status: "Pending",
        type: item.from === self ? "debit" : "credit",
        sourceKind: "split",
        sourceId: group.id,
        sourceLabel: group.name,
      });
    }
    for (const payment of group.repayments || []) {
      if (payment.reversedAt || (payment.from !== self && payment.to !== self))
        continue;
      rows.push({
        id: `split-paid:${group.id}:${payment.id}`,
        name: payment.from === self ? payment.to : payment.from,
        amount: payment.amount,
        status: "Paid",
        type: payment.from === self ? "debit" : "credit",
        sourceKind: "split",
        sourceId: group.id,
        sourceLabel: group.name,
        dueDate: payment.date,
      });
    }
  }
  for (const loan of state.loans || []) {
    const summary = loanSummary(loan);
    if (summary.remaining > 0)
      rows.push({
        id: `loan:${loan.id}`,
        name: loan.party,
        amount: summary.remaining,
        status: "Pending",
        type: loan.kind === "borrowed" ? "debit" : "credit",
        dueDate: summary.next?.date,
        sourceKind: "loan",
        sourceId: loan.id,
        sourceLabel: loan.name,
      });
    for (const payment of loan.payments)
      rows.push({
        id: `loan-paid:${loan.id}:${payment.id}`,
        name: loan.party,
        amount: payment.amount,
        status: "Paid",
        type: loan.kind === "borrowed" ? "debit" : "credit",
        sourceKind: "loan",
        sourceId: loan.id,
        sourceLabel: loan.name,
        dueDate: payment.date,
      });
  }
  return rows;
}
