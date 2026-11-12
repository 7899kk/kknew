import assert from "node:assert/strict";
import { loanTermsPlan } from "../utils/loanTerms";
import {
  loanSchema,
  ledgerSchema,
  encodeLedger,
  decodeLedger,
} from "../utils/ledgerSchema";
import { loanSchedule, monthlyLoanReserve } from "../utils/loans";
import { paymentReminders, remindersDue } from "../utils/paymentReminders";
import { applyCapturedPayments } from "../utils/capturedPayments";
import { recordedCashFlow, monthlyBalancePoints } from "../utils/dashboardData";
import { financeSummary } from "../utils/financeSummary";
const plan = loanTermsPlan(100000, 12, 12);
assert.equal(plan.recommended, 8884.88);
// Independent integer oracle for this 1%-per-month loan, rounding interest half up.
let balance = 10000000n,
  interest = 0n;
for (let m = 0; m < 12; m++) {
  const fee = (balance + 50n) / 100n;
  interest += fee;
  balance -= m === 11 ? balance : 888488n - fee;
}
assert.equal(balance, 0n);
assert.equal(plan.interest, Number(interest) / 100);
assert.equal(plan.total, 106618.53);
assert.equal(plan.finalPayment, 8884.85);
assert.equal(plan.installments.at(-1)?.balance, 0);
assert.equal(loanTermsPlan(12000, 0, 12).monthly, 1000);
assert.equal(loanTermsPlan(12000, 0, 12, 2000).installments.length, 6);
assert.equal(loanTermsPlan(100000, 12, 12, 8000).finalPayment > 8000, true);
for (const args of [
  [0, 12, 12],
  [1000, -1, 12],
  [1000, 101, 12],
  [1000, 12, 0],
  [1000, 12, 1201],
  [1000, 12, 1.5],
  [1000, 12, 12, 10],
  [1000, 12, 12, 0],
  [1000.001, 12, 12],
  [1000, 12, 12, 100.001],
])
  assert.throws(() =>
    loanTermsPlan(...(args as [number, number, number, number?])),
  );
const loan = loanSchema.parse({
  id: "l",
  name: "Home",
  party: "Bank",
  kind: "borrowed",
  principal: plan.total,
  monthlyPayment: plan.monthly,
  firstDueDate: "2026-01-31",
  terms: { amount: 100000, annualRate: 12, months: 12 },
  payments: [],
});
assert.equal(
  loanSchema.safeParse({ ...loan, principal: 100000 }).success,
  false,
);
assert.equal(loanSchedule(loan)[1].date, "2026-02-28");
assert.equal(loanSchedule(loan)[2].date, "2026-03-31");
assert.equal(
  loanSchedule(loan).reduce((n, s) => n + Math.round(s.amount * 100), 0) / 100,
  plan.total,
);
assert.equal(monthlyLoanReserve([loan], "2026-01"), 8884.88);
const debt = {
  id: "d",
  name: "Rent",
  amount: 1000,
  type: "debit" as const,
  status: "Pending" as const,
  dueDate: "2026-01-31",
};
assert.equal(
  remindersDue(
    paymentReminders({ loans: [loan], debts: [debt] }, "2026-01-23"),
    "2026-01-23",
  ).length,
  0,
);
assert.equal(
  remindersDue(
    paymentReminders({ loans: [loan], debts: [debt] }, "2026-01-24"),
    "2026-01-24",
  ).length,
  2,
);
assert.equal(
  paymentReminders(
    {
      loans: [{ ...loan, kind: "lent" }],
      debts: [{ ...debt, status: "Paid" }],
    },
    "2026-01-31",
  ).length,
  0,
);
const paid = {
  ...loan,
  payments: [{ id: "p", date: "2026-01-31", amount: 8884.88 }],
};
assert.equal(
  paymentReminders({ loans: [paid], debts: [] }, "2026-01-31")[0].dueDate,
  "2026-02-28",
);
assert.equal(
  remindersDue(
    paymentReminders({ loans: [paid], debts: [] }, "2026-01-31"),
    "2026-01-31",
  ).length,
  0,
);
const profile = {
  name: "Test",
  username: "test",
  monthlySalary: 50000,
  yearlySalary: 600000,
  otherIncome: 0,
  currentSavings: 20000,
  onboardingComplete: true,
};
const base = ledgerSchema.parse({
  profile,
  expenses: [],
  incomes: [],
  autoExpenses: [],
  debts: [],
  stocks: [],
  cryptos: [],
  goldSilver: [],
  goals: [],
  billGroups: [],
  capturedIds: [],
  paymentReviews: [],
});
const timestamp = new Date(2026, 0, 31, 10).getTime(),
  credit = {
    id: "sms1",
    kind: "income" as const,
    amount: 1000,
    source: "sms:VM-HDFCBK",
    timestamp,
    reference: "TEST1000001",
    bankKey: "HDFC",
    accountKey: "1234",
    balanceAfter: 5000,
  };
const captured = applyCapturedPayments(base, [credit]);
assert.equal(financeSummary(captured, "2026-01").balance, 71000);
assert.equal(recordedCashFlow(captured, "2026-01").earned, 1000);
assert.equal(
  monthlyBalancePoints(
    profile,
    captured.incomes,
    captured.expenses,
    "2026-01",
  ).at(-1),
  71000,
);
const delayed = applyCapturedPayments(captured, [
  {
    ...credit,
    id: "repeat",
    reference: "TEST1000002",
    timestamp: timestamp + 3600000,
  },
]);
assert.equal(delayed.incomes.length, 1);
assert.equal(delayed.paymentReviews.length, 1);
assert.equal(financeSummary(delayed, "2026-01").balance, 71000);
const debit = applyCapturedPayments(captured, [
  {
    ...credit,
    id: "debit",
    kind: "expense",
    amount: 200,
    reference: "TEST1000003",
    timestamp: timestamp + 2000,
  },
]);
assert.deepEqual(recordedCashFlow(debit, "2026-01"), {
  earned: 1000,
  spent: 200,
  net: 800,
});
assert.equal(financeSummary(debit, "2026-01").balance, 70800);
const image = "data:image/jpeg;base64,goal-image";
const full = {
  ...base,
  loans: [loan],
  remindersEnabled: true,
  goals: [
    {
      id: "g",
      name: "Bike",
      emoji: "🏍",
      targetAmount: 10000,
      savedAmount: 0,
      imageUri: image,
    },
  ],
};
const saved = decodeLedger(encodeLedger(full));
assert.equal(saved.goals[0].imageUri, image);
assert.deepEqual(saved.loans[0].terms, loan.terms);
assert.equal(saved.remindersEnabled, true);
console.log(
  "Loan terms/reminder/dashboard checks passed: reducing interest with independent integer oracle, actual EMI and final payment, month ends, invalid plans, seven-day reminders and payment cancellation, SMS cash/graphs and delayed-repeat review, goal image and terms backup.",
);
