import { localDate, monthlyTotals, validDate } from "./financeValidation";
import type {
  AutoExpense,
  Expense,
  IncomeEntry,
  SavingsGoal,
  UserProfile,
} from "../context/AppContext";

type Ledger = {
  profile: UserProfile;
  incomes: IncomeEntry[];
  expenses: Expense[];
  autoExpenses: AutoExpense[];
  goals: SavingsGoal[];
};
const paisa = (amount: number) =>
  Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : 0;
const total = (values: number[]) =>
  values.reduce((sum, value) => sum + paisa(value), 0) / 100;

export function financeSummary(state: Ledger, month = localDate().slice(0, 7)) {
  const totals = monthlyTotals(
    month,
    total([state.profile.monthlySalary, state.profile.otherIncome]),
    state.incomes,
    state.expenses,
    state.profile.monthlySalary,
  );
  const income = Math.round(totals.income * 100) / 100;
  const expenses = Math.round(totals.expenses * 100) / 100;
  const recurring = total(
    state.autoExpenses
      .filter((item) => item.isActive)
      .map((item) => item.amount),
  );
  const goalSavings = total(state.goals.map((item) => item.savedAmount));
  const balance =
    (paisa(state.profile.currentSavings) + paisa(income) - paisa(expenses)) /
    100;
  const availableBalance =
    Math.round((balance - goalSavings - recurring) * 100) / 100;
  return {
    income,
    expenses,
    recurring,
    goalSavings,
    balance,
    availableBalance,
    monthlySurplus: Math.round((income - expenses - recurring) * 100) / 100,
  };
}

export function goalSavingsPlan(
  goal: Pick<SavingsGoal, "targetAmount" | "savedAmount" | "targetDate">,
  monthlySurplus: number,
  today = localDate(),
) {
  const remaining =
    Math.max(0, paisa(goal.targetAmount) - paisa(goal.savedAmount)) / 100;
  let months: number | null = null;
  let overdue = false;
  if (goal.targetDate && validDate(goal.targetDate) && validDate(today)) {
    const utc = (value: string) => {
      const [y, m, d] = value.split("-").map(Number);
      return Date.UTC(y, m - 1, d);
    };
    const days = Math.ceil((utc(goal.targetDate) - utc(today)) / 86400000);
    overdue = days < 0;
    months = Math.max(1, Math.ceil(days / 30));
  }
  const monthlyAmount =
    months === null
      ? Math.min(remaining, Math.floor(Math.max(0, monthlySurplus) * 20) / 100)
      : Math.ceil((remaining * 100) / months) / 100;
  return {
    remaining,
    monthlyAmount,
    months,
    overdue,
    affordable: monthlyAmount <= Math.max(0, monthlySurplus),
  };
}

export function contributeToGoal<T extends Ledger>(
  previous: T,
  id: string,
  amount: number,
  month = localDate().slice(0, 7),
): T {
  const goal = previous.goals.find((item) => item.id === id);
  const value = paisa(amount);
  if (
    !goal ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 1e12 ||
    value <= 0 ||
    Math.abs(value / 100 - amount) > 1e-8
  )
    return previous;
  const summary = financeSummary(previous, month);
  if (
    value > Math.round(Math.max(0, summary.availableBalance) * 100) ||
    value > paisa(goal.targetAmount) - paisa(goal.savedAmount)
  )
    return previous;
  return {
    ...previous,
    goals: previous.goals.map((item) =>
      item.id === id
        ? { ...item, savedAmount: (paisa(item.savedAmount) + value) / 100 }
        : item,
    ),
  };
}

/** One shared savings allowance, so multiple dreams never each spend the same surplus. */
export function nextMonthSavingsPlan(state: Ledger, today = localDate()) {
  const [year, month, day] = today.split("-").map(Number);
  const previous = localDate(new Date(year, month - 2, 1)).slice(0, 7);
  const current = today.slice(0, 7);
  const completed = [...state.expenses, ...state.incomes].some((e) =>
    e.date.startsWith(previous),
  );
  const referenceMonth = completed ? previous : current;
  const targetMonth = completed
    ? current
    : localDate(new Date(year, month, 1)).slice(0, 7);
  const hasData = [...state.expenses, ...state.incomes].some((e) =>
    e.date.startsWith(referenceMonth),
  );
  const summary = financeSummary(state, referenceMonth);
  // In the first month, extrapolate spending through month end rather than overstate savings.
  const projectedExpenses = completed
    ? summary.expenses
    : Math.round(
        ((summary.expenses * new Date(year, month, 0).getDate()) / day) * 100,
      ) / 100;
  const surplus = hasData
    ? Math.max(
        0,
        Math.round(
          (summary.income - projectedExpenses - summary.recurring) * 100,
        ),
      )
    : 0;
  const remaining = state.goals.map((g) => ({
    id: g.id,
    cents: Math.max(0, paisa(g.targetAmount) - paisa(g.savedAmount)),
  }));
  const totalRemaining = remaining.reduce((sum, g) => sum + g.cents, 0);
  const budget = Math.min(totalRemaining, Math.floor(surplus * 0.2));
  const allocations = remaining.map((g) => ({
    id: g.id,
    cents: totalRemaining ? Math.floor((budget * g.cents) / totalRemaining) : 0,
    remaining: g.cents,
  }));
  let leftover = budget - allocations.reduce((sum, g) => sum + g.cents, 0);
  for (const g of allocations)
    if (leftover > 0 && g.cents < g.remaining) {
      g.cents++;
      leftover--;
    }
  return {
    referenceMonth,
    targetMonth,
    estimated: !completed,
    hasData,
    total: budget / 100,
    suggestions: Object.fromEntries(
      allocations.map((g) => [g.id, g.cents / 100]),
    ) as Record<string, number>,
  };
}
