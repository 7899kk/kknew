import type { Expense, IncomeEntry } from "../context/AppContext";
export type PaymentReceipt = {
  id: string;
  amount: number;
  date: string;
  time?: string;
  source?: string;
  kind: "income" | "expense";
  timestamp?: number;
};
export function selectNewPaymentReceipt(
  previousIds: string[],
  expenses: Expense[],
  incomes: IncomeEntry[],
): PaymentReceipt | null {
  const seen = new Set(previousIds);
  return (
    [
      ...expenses
        .filter((e) => e.captureId && !seen.has(e.captureId))
        .map((e) => ({ ...e, kind: "expense" as const })),
      ...incomes
        .filter((e) => e.captureId && !seen.has(e.captureId))
        .map((e) => ({ ...e, kind: "income" as const })),
    ].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0] || null
  );
}
