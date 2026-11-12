import assert from "node:assert/strict";
import {
  financeSummary,
  goalSavingsPlan,
  contributeToGoal,
} from "../utils/financeSummary";
import type {
  Expense,
  IncomeEntry,
  AutoExpense,
  SavingsGoal,
  UserProfile,
} from "../context/AppContext";
const profile: UserProfile = {
  name: "J7Tester",
  username: "j7tester",
  monthlySalary: 100000,
  yearlySalary: 1200000,
  otherIncome: 0,
  currentSavings: 1000,
  onboardingComplete: true,
};
const state = {
  profile,
  incomes: [] as IncomeEntry[],
  expenses: [] as Expense[],
  autoExpenses: [] as AutoExpense[],
  goals: [
    { id: "bike", name: "Dream Bike", targetAmount: 50000, savedAmount: 0 },
  ] as SavingsGoal[],
};
const month = "2026-10";
assert.equal(financeSummary(state, month).balance, 101000);
const spent = {
  ...state,
  expenses: [
    {
      id: "expense",
      amount: 2500,
      date: "2026-10-08",
      time: "12:00",
      category: "Others",
      paymentType: "Cash",
    },
  ] as Expense[],
};
assert.equal(financeSummary(spent, month).balance, 98500);
assert.equal(financeSummary({ ...spent, expenses: [] }, month).balance, 101000);
const saved = contributeToGoal(spent, "bike", 1000, month);
assert.equal(saved.goals[0].savedAmount, 1000);
assert.equal(financeSummary(saved, month).balance, 98500);
assert.equal(financeSummary(saved, month).availableBalance, 97500);
assert.equal(
  financeSummary(JSON.parse(JSON.stringify(saved)), month).availableBalance,
  97500,
);
assert.equal(contributeToGoal(saved, "bike", 50000, month), saved);
assert.equal(
  contributeToGoal(
    {
      ...saved,
      profile: { ...profile, currentSavings: 0, monthlySalary: 3000 },
    },
    "bike",
    1000,
    month,
  ).goals[0].savedAmount,
  1000,
);
assert.equal(contributeToGoal(saved, "missing", 1000, month), saved);
for (const value of [-1, 0, NaN, Infinity, 0.001])
  assert.equal(contributeToGoal(saved, "bike", value, month), saved);
const cents = contributeToGoal(saved, "bike", 0.25, month);
assert.equal(cents.goals[0].savedAmount, 1000.25);
const recurring = {
  ...spent,
  autoExpenses: [
    {
      id: "rent",
      description: "Rent",
      category: "Others",
      paymentType: "Cash",
      amount: 10000,
      isActive: true,
    },
  ] as AutoExpense[],
};
assert.equal(financeSummary(recurring, month).balance, 98500);
assert.equal(financeSummary(recurring, month).availableBalance, 88500);
assert.equal(financeSummary(recurring, month).monthlySurplus, 87500);
assert.equal(
  goalSavingsPlan(state.goals[0], 87500, "2026-10-08").monthlyAmount,
  17500,
);
assert.equal(
  goalSavingsPlan(
    { ...state.goals[0], targetDate: "2026-12-07" },
    87500,
    "2026-10-08",
  ).monthlyAmount,
  25000,
);
assert.equal(
  goalSavingsPlan(
    { ...state.goals[0], targetDate: "2026-10-01" },
    0,
    "2026-10-08",
  ).overdue,
  true,
);
assert.equal(
  goalSavingsPlan(state.goals[0], -100, "2026-10-08").monthlyAmount,
  0,
);
assert.equal(
  goalSavingsPlan(
    { ...state.goals[0], savedAmount: 50000 },
    87500,
    "2026-10-08",
  ).remaining,
  0,
);
// Explicit salary replaces its estimate; additional/unclassified credits add money.
assert.equal(
  financeSummary(
    {
      ...state,
      incomes: [
        {
          id: "salary",
          date: "2026-10-08",
          amount: 100000,
          category: "Salary",
        },
      ],
    },
    month,
  ).balance,
  101000,
);
assert.equal(
  financeSummary(
    {
      ...state,
      incomes: [{ id: "credit", date: "2026-10-08", amount: 10000 }],
    },
    month,
  ).balance,
  111000,
);
assert.equal(
  financeSummary(
    {
      ...spent,
      expenses: [
        ...spent.expenses,
        { ...spent.expenses[0], id: "old", date: "2026-09-08", amount: 10000 },
      ],
    },
    month,
  ).balance,
  98500,
);
console.log(
  "Dashboard and goals checks passed: salary + starting savings, expenses, deletion, cash reservations, restart, cent precision, limits and saving plans.",
);

// Suggestions share a single previous-month allowance across every dream.
const { nextMonthSavingsPlan } = await import("../utils/financeSummary");
const dreams = {
  ...spent,
  goals: [
    { ...state.goals[0], targetAmount: 10000 },
    { ...state.goals[0], id: "car", targetAmount: 30000 },
  ],
};
const forecast = nextMonthSavingsPlan(dreams, "2026-11-12");
assert.equal(forecast.referenceMonth, "2026-10");
assert.equal(forecast.targetMonth, "2026-11");
assert.equal(forecast.estimated, false);
assert.equal(forecast.total, 19500);
assert.equal(forecast.suggestions.bike, 4875);
assert.equal(forecast.suggestions.car, 14625);
assert.equal(
  Object.values(forecast.suggestions).reduce(
    (s, n) => s + Math.round(n * 100),
    0,
  ),
  1950000,
);
assert.equal(nextMonthSavingsPlan(state, "2026-11-12").total, 0);
assert.equal(
  nextMonthSavingsPlan(
    {
      ...dreams,
      goals: dreams.goals.map((g) => ({ ...g, savedAmount: g.targetAmount })),
    },
    "2026-11-12",
  ).total,
  0,
);
const first = nextMonthSavingsPlan(spent, "2026-10-08");
assert.equal(first.estimated, true);
assert.equal(first.targetMonth, "2026-11");
assert.equal(first.total, 18062.5); // 2,500 spent in 8 days -> 9,687.50 projected through Oct 31.
assert.equal(
  nextMonthSavingsPlan(
    { ...spent, profile: { ...profile, monthlySalary: 0 } },
    "2026-11-12",
  ).total,
  0,
);
const rollover = nextMonthSavingsPlan(
  {
    ...spent,
    expenses: spent.expenses.map((e) => ({ ...e, date: "2026-12-08" })),
  },
  "2027-01-01",
);
assert.equal(rollover.referenceMonth, "2026-12");
assert.equal(rollover.targetMonth, "2027-01");
console.log(
  "Savings forecast checks passed: shared allowance, previous-month basis, first-month estimates, no history, completed goals, deficits and year rollover.",
);
