import assert from "node:assert/strict";
import { correctTransactionDirection } from "../utils/transactionDirection";
import { financeSummary } from "../utils/financeSummary";
import type { Expense, IncomeEntry } from "../context/AppContext";
import type { Loan } from "../utils/ledgerSchema";
const expense: Expense = {
  id: "expense",
  date: "2026-11-12",
  amount: 321.45,
  notes: "Groceries",
  category: "Food",
  paymentType: "Cash",
  captureId: "capture",
  upiRef: "REF1000001",
};
const base = {
  profile: {
    name: "Test",
    username: "test",
    monthlySalary: 1000,
    yearlySalary: 12000,
    otherIncome: 0,
    currentSavings: 0,
    onboardingComplete: true,
  },
  expenses: [expense],
  incomes: [] as IncomeEntry[],
  loans: [] as Loan[],
  goals: [],
  autoExpenses: [],
  capturedIds: ["capture"],
};
assert.equal(financeSummary(base, "2026-11").balance, 678.55);
const income = correctTransactionDirection(
  base,
  "expense",
  "expense",
  "income",
  { amount: 321.45, date: expense.date, notes: expense.notes },
);
assert.equal(income.expenses.length, 0);
assert.equal(income.incomes.length, 1);
assert.equal(income.incomes[0].reference, "REF1000001");
assert.equal(financeSummary(income, "2026-11").balance, 1321.45);
const corrected = correctTransactionDirection(
  income,
  "expense",
  "income",
  "expense",
  { amount: 321.45, date: expense.date, notes: expense.notes },
);
assert.equal(corrected.expenses.length, 1);
assert.equal(corrected.incomes.length, 0);
assert.equal(corrected.expenses[0].captureId, "capture");
assert.deepEqual(corrected.capturedIds, ["capture"]);
assert.equal(financeSummary(corrected, "2026-11").balance, 678.55);
assert.throws(() =>
  correctTransactionDirection(base, "missing", "expense", "income", {
    amount: 321.45,
    date: expense.date,
  }),
);
assert.throws(() =>
  correctTransactionDirection(
    {
      ...base,
      loans: [
        {
          id: "l",
          name: "Loan",
          party: "Bank",
          kind: "borrowed",
          principal: 1000,
          monthlyPayment: 100,
          firstDueDate: expense.date,
          payments: [
            {
              id: "p",
              date: expense.date,
              amount: 321.45,
              activityId: "expense",
            },
          ],
        },
      ],
    },
    "expense",
    "expense",
    "income",
    { amount: 321.45, date: expense.date },
  ),
);
console.log(
  "Direction correction checks passed: expense/income separation, one atomic move, exact budget changes, reference/replay retention, and matched-loan protection.",
);
const { applyCapturedPayments } = await import("../utils/capturedPayments");
const withCorrections = { ...corrected, paymentReviews: [] };
const replay = applyCapturedPayments(withCorrections, [
  {
    id: "native-conflict-repeat",
    kind: "review",
    amount: 321.45,
    source: "sms:VM-HDFCBK",
    timestamp: new Date(2026, 10, 12, 12).getTime(),
    reference: "REF1000001",
    conflict: true,
  },
]);
assert.equal(replay.expenses.length, 1);
assert.equal(replay.incomes.length, 0);
assert.equal(replay.paymentReviews.length, 0);
