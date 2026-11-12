import type { Loan } from "./ledgerSchema";
import type { DebtEntry } from "../context/AppContext";
import { loanSummary } from "./loans";
import { localDate, validDate } from "./financeValidation";
export type PaymentReminder = {
  id: string;
  title: string;
  dueDate: string;
  amount: number;
};
export function paymentReminders(
  state: { loans: Loan[]; debts: DebtEntry[] },
  today = localDate(),
): PaymentReminder[] {
  return [
    ...state.loans
      .filter((l) => l.kind === "borrowed")
      .flatMap((l) => {
        const next = loanSummary(l, today).next;
        return next
          ? [
              {
                id: "loan:" + l.id,
                title: l.name + " EMI",
                dueDate: next.date,
                amount: next.remaining,
              },
            ]
          : [];
      }),
    ...state.debts
      .filter(
        (d) =>
          d.type === "debit" &&
          d.status !== "Paid" &&
          d.dueDate &&
          validDate(d.dueDate),
      )
      .map((d) => ({
        id: "debt:" + d.id,
        title: d.name,
        dueDate: d.dueDate!,
        amount: d.amount,
      })),
  ].sort(
    (a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id),
  );
}
export function remindersDue(items: PaymentReminder[], today = localDate()) {
  const [y, m, d] = today.split("-").map(Number),
    week = localDate(new Date(y, m - 1, d + 7));
  return items.filter((i) => i.dueDate <= week);
}
