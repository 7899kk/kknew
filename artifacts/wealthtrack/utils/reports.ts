import type { Expense, IncomeEntry, UserProfile } from "../context/AppContext";
import { monthlyTotals } from "./financeValidation";
import type { Budget } from "./ledgerSchema";
export function monthlyReport(
  month: string,
  profile: UserProfile,
  incomes: IncomeEntry[],
  expenses: Expense[],
  budgets: Budget[],
) {
  const totals = monthlyTotals(
    month,
    profile.monthlySalary + profile.otherIncome,
    incomes,
    expenses,
    profile.monthlySalary,
  );
  const categories: Record<string, number> = {};
  for (const e of expenses.filter((e) => e.date.startsWith(month)))
    categories[e.category] =
      (categories[e.category] || 0) + Math.round(e.amount * 100);
  const breakdown = Object.fromEntries(
    Object.entries(categories).map(([k, v]) => [k, v / 100]),
  );
  return {
    ...totals,
    surplus:
      (Math.round(totals.income * 100) - Math.round(totals.expenses * 100)) /
      100,
    breakdown,
    budgets: budgets
      .filter((b) => b.month === month)
      .map((b) => ({
        ...b,
        spent: breakdown[b.category] || 0,
        remaining:
          (Math.round(b.limit * 100) - (categories[b.category] || 0)) / 100,
      })),
  };
}

export function spendingComparison(
  month: string,
  expenses: Expense[],
  today = new Date(),
) {
  const [year, index] = month.split("-").map(Number);
  const previousDate = new Date(year, index - 2, 1);
  const previousMonth = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, "0")}`;
  const isCurrent =
    month ===
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const lastPreviousDay = new Date(year, index - 1, 0).getDate();
  const cutoff = isCurrent ? today.getDate() : 31;
  const previousCutoff = isCurrent
    ? Math.min(cutoff, lastPreviousDay)
    : lastPreviousDay;
  const current = expenses.filter(
    (e) => e.date.startsWith(month) && Number(e.date.slice(-2)) <= cutoff,
  );
  const previous = expenses.filter(
    (e) =>
      e.date.startsWith(previousMonth) &&
      Number(e.date.slice(-2)) <= previousCutoff,
  );
  const sum = (entries: Expense[]) =>
    entries.reduce((total, e) => total + Math.round(e.amount * 100), 0);
  const currentCents = sum(current),
    previousCents = sum(previous),
    difference = currentCents - previousCents;
  const currency = (n: number) =>
    "₹" +
    Math.abs(n / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const previousName = previousDate.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const period = isCurrent
    ? `1–${previousCutoff} ${previousName}`
    : previousName;
  const percent =
    previousCents > 0
      ? Math.round((Math.abs(difference) / previousCents) * 1000) / 10
      : null;
  const message = !previous.length
    ? `No expenses recorded for ${period} yet.`
    : difference === 0
      ? `Your spending is the same as ${period}.`
      : `You spent ${currency(difference)} ${difference > 0 ? "more" : "less"}${percent === null ? "" : ` (${percent}%)`} than ${period}.`;
  const increases = [
    ...new Set([...current, ...previous].map((e) => e.category)),
  ]
    .map((category) => ({
      category,
      amount:
        (sum(current.filter((e) => e.category === category)) -
          sum(previous.filter((e) => e.category === category))) /
        100,
    }))
    .filter((e) => e.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
  return {
    current: currentCents / 100,
    previous: previousCents / 100,
    difference: difference / 100,
    percent,
    message,
    period,
    isCurrent,
    hasPrevious: previous.length > 0,
    increases,
  };
}
