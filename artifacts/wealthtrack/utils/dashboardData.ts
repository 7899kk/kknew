import type { Expense, IncomeEntry, UserProfile } from "../context/AppContext";
import { localDate } from "./financeValidation";
export function monthlyBalancePoints(
  profile: UserProfile,
  incomes: IncomeEntry[],
  expenses: Expense[],
  month = localDate().slice(0, 7),
) {
  const [y, m] = month.split("-").map(Number),
    days = new Date(y, m, 0).getDate();
  let balance = Math.round(
      (profile.currentSavings + profile.monthlySalary + profile.otherIncome) *
        100,
    ),
    salary = 0;
  const points = [balance / 100];
  for (let day = 1; day <= days; day++) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    for (const entry of incomes.filter((e) => e.date === date)) {
      if (entry.category?.trim().toLowerCase() === "salary") {
        const before = Math.max(
          0,
          salary - Math.round(profile.monthlySalary * 100),
        );
        salary += Math.round(entry.amount * 100);
        balance +=
          Math.max(0, salary - Math.round(profile.monthlySalary * 100)) -
          before;
      } else balance += Math.round(entry.amount * 100);
    }
    balance -= expenses
      .filter((e) => e.date === date)
      .reduce((s, e) => s + Math.round(e.amount * 100), 0);
    points.push(balance / 100);
  }
  return points;
}
export function categoryTotals(
  expenses: Expense[],
  month = localDate().slice(0, 7),
) {
  const cents: Record<string, number> = {};
  for (const e of expenses.filter((e) => e.date.startsWith(month)))
    cents[e.category] = (cents[e.category] || 0) + Math.round(e.amount * 100);
  return Object.entries(cents)
    .map(([name, n]) => ({ name, amount: n / 100 }))
    .sort((a, b) => b.amount - a.amount);
}
