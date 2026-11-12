import { categories } from "./ledgerSchema";
import type { Expense, IncomeEntry } from "../context/AppContext";
import type { Loan } from "./ledgerSchema";
/** Explicit user correction. Collection membership is the sole debit/credit source. */
export function correctTransactionDirection<
  T extends { expenses: Expense[]; incomes: IncomeEntry[]; loans: Loan[] },
>(
  state: T,
  id: string,
  from: "expense" | "income",
  to: "expense" | "income",
  details: {
    amount: number;
    date: string;
    notes?: string;
    name?: string;
    category?: string;
  },
): T {
  if (from === to) return state;
  if (state.loans.some((l) => l.payments.some((p) => p.activityId === id)))
    throw Error(
      "Undo the matched loan repayment before changing its cash direction.",
    );
  const old = (from === "expense" ? state.expenses : state.incomes).find(
    (e) => e.id === id,
  );
  if (!old) throw Error("This transaction no longer exists.");
  if (
    (to === "expense" ? state.expenses : state.incomes).some((e) => e.id === id)
  )
    throw Error("Another transaction already uses this ID.");
  const common = {
    directionCorrected: true,
    id: old.id,
    date: details.date,
    amount: details.amount,
    notes: details.notes,
    time: old.time,
    timestamp: old.timestamp,
    source: old.source,
    captureId: old.captureId,
    bankKey: old.bankKey,
    accountKey: old.accountKey,
    balanceAfter: old.balanceAfter,
  };
  if (to === "expense")
    return {
      ...state,
      incomes: state.incomes.filter((e) => e.id !== id),
      expenses: [
        {
          ...common,
          category: categories.includes(details.category as Expense["category"])
            ? (details.category as Expense["category"])
            : "Others",
          paymentType: "Bank",
          upiRef: "reference" in old ? old.reference || undefined : undefined,
        },
        ...state.expenses,
      ],
    };
  return {
    ...state,
    expenses: state.expenses.filter((e) => e.id !== id),
    incomes: [
      {
        ...common,
        category: details.category || "Uncategorized",
        name: details.name || "Money received",
        reference: "upiRef" in old ? old.upiRef : undefined,
      },
      ...state.incomes,
    ],
  };
}
