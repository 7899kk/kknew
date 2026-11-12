import assert from "node:assert/strict";
import { linkedObligations, localGroupMember } from "../utils/obligations";
import {
  loanSummary,
  loanSchedule,
  monthlyLoanReserve,
  plannedLoanCost,
  installmentDate,
} from "../utils/loans";
import { financeSummary, nextMonthSavingsPlan } from "../utils/financeSummary";
import {
  ledgerSchema,
  loanSchema,
  encodeLedger,
  decodeLedger,
} from "../utils/ledgerSchema";
import {
  applyCapturedPayments,
  resolveCapturedPayment,
} from "../utils/capturedPayments";
import { monthlyBalancePoints } from "../utils/dashboardData";
const profile = {
  name: "Alice",
  username: "alice",
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
assert.deepEqual(base.loans, []);
assert.deepEqual(base.groupMemberships, {});
const group = {
  id: "g",
  name: "Weekend",
  members: ["Alice", "Bob", "Cara"],
  expenses: [
    {
      id: "bill",
      description: "Meal",
      amount: 300,
      paidBy: "Alice",
      splitAmong: ["Alice", "Bob", "Cara"],
      date: "2026-11-01",
    },
  ],
  createdAt: "2026-11-01",
  repayments: [],
};
const withGroup = { ...base, billGroups: [group] };
const sum = (
  rows: ReturnType<typeof linkedObligations>,
  type: string,
  status = "Pending",
) =>
  rows
    .filter((r) => r.type === type && r.status === status)
    .reduce((s, r) => s + Math.round(r.amount * 100), 0) / 100;
assert.equal(sum(linkedObligations(withGroup), "credit"), 200);
assert.equal(
  sum(
    linkedObligations({ ...withGroup, groupMemberships: { g: "Bob" } }),
    "debit",
  ),
  100,
);
assert.equal(localGroupMember(group, {}, profile), "Alice");
assert.equal(
  linkedObligations({
    ...withGroup,
    profile: { ...profile, name: "Someone else", username: "other" },
  }).length,
  0,
);
const paid = {
  ...withGroup,
  billGroups: [
    {
      ...group,
      repayments: [
        { id: "r", from: "Bob", to: "Alice", amount: 40, date: "2026-11-02" },
      ],
    },
  ],
};
assert.equal(sum(linkedObligations(paid), "credit"), 160);
assert.equal(sum(linkedObligations(paid), "credit", "Paid"), 40);
assert.equal(financeSummary(paid, "2026-11").balance, 70000); // Dues never create cash entries.
const reversed = {
  ...paid,
  billGroups: [
    {
      ...paid.billGroups[0],
      repayments: [
        { ...paid.billGroups[0].repayments[0], reversedAt: "2026-11-03" },
      ],
    },
  ],
};
assert.equal(sum(linkedObligations(reversed), "credit"), 200);
assert.equal(sum(linkedObligations(reversed), "credit", "Paid"), 0);
const loan = loanSchema.parse({
  id: "loan",
  name: "Bike loan",
  party: "Bank",
  kind: "borrowed",
  principal: 12000,
  monthlyPayment: 2000,
  firstDueDate: "2026-11-12",
  payments: [],
});
assert.equal(loanSummary(loan, "2026-11-12").remaining, 12000);
assert.equal(monthlyLoanReserve([loan], "2026-11"), 2000);
const state = { ...paid, loans: [loan] };
assert.equal(financeSummary(state, "2026-11").availableBalance, 68000);
const payment = { id: "p", date: "2026-11-12", amount: 500 };
const partial = { ...loan, payments: [payment] };
assert.equal(loanSummary(partial, "2026-11-12").remaining, 11500);
assert.equal(monthlyLoanReserve([partial], "2026-11"), 1500);
assert.equal(
  financeSummary({ ...state, loans: [partial] }, "2026-11").balance,
  70000,
);
assert.equal(
  financeSummary({ ...state, loans: [partial] }, "2026-11").availableBalance,
  68500,
);
assert.equal(
  sum(linkedObligations({ ...state, loans: [partial] }), "debit"),
  11500,
);
assert.equal(
  sum(linkedObligations({ ...state, loans: [partial] }), "debit", "Paid"),
  500,
);
assert.equal(monthlyLoanReserve([loan], "2027-01"), 6000); // Overdue + this month, without double counting.
assert.equal(monthlyLoanReserve([{ ...loan, kind: "lent" }], "2026-11"), 0);
assert.equal(installmentDate("2026-01-31", 1), "2026-02-28");
assert.equal(installmentDate("2026-01-31", 2), "2026-03-31");
assert.equal(installmentDate("2028-01-31", 1), "2028-02-29");
const penny = loanSchedule({ ...loan, principal: 2.01, monthlyPayment: 1 });
assert.deepEqual(
  penny.map((p) => p.amount),
  [1, 1, 0.01],
);
assert.equal(
  loanSchema.safeParse({
    ...loan,
    payments: [{ ...payment, amount: 12000.01 }],
  }).success,
  false,
);
assert.equal(
  loanSchema.safeParse({ ...loan, monthlyPayment: 0.01 }).success,
  false,
);
assert.equal(
  loanSchema.safeParse({ ...loan, firstDueDate: "2026-02-30" }).success,
  false,
);
const full = { ...state, loans: [partial], groupMemberships: { g: "Alice" } };
const encoded = encodeLedger(full);
assert.equal(JSON.parse(encoded).version, 3);
assert.deepEqual(
  decodeLedger(JSON.stringify({ ...JSON.parse(encoded), version: 1 })),
  ledgerSchema.parse(full),
);
assert.throws(() =>
  decodeLedger(JSON.stringify({ ...JSON.parse(encoded), version: 4 })),
);
assert.equal(JSON.parse(encoded).ledger.loans[0].principal, 1200000);
assert.deepEqual(decodeLedger(encoded), ledgerSchema.parse(full));
assert.equal(
  ledgerSchema.safeParse({
    ...full,
    loans: [
      { ...loan, payments: [{ ...payment, activityId: "same" }] },
      {
        ...loan,
        id: "l2",
        payments: [{ ...payment, id: "p2", activityId: "same" }],
      },
    ],
  }).success,
  false,
);
const timestamp = new Date(2026, 10, 12, 10, 0).getTime();
const event = {
  id: "one",
  kind: "income" as const,
  amount: 1000,
  source: "sms:VM-HDFCBK",
  reference: "REF1000001",
  bankKey: "HDFC",
  accountKey: "1234",
  balanceAfter: 5000,
  timestamp,
};
const first = applyCapturedPayments(base, [event]);
const same = applyCapturedPayments(first, [
  {
    ...event,
    id: "another-bank-alert",
    source: "sms:AD-HDFCBN",
    timestamp: timestamp + 1000,
  },
]);
assert.equal(same.incomes.length, 1);
assert.equal(same.paymentReviews.length, 0);
const repeated = applyCapturedPayments(first, [
  {
    ...event,
    id: "ambiguous",
    reference: "REF1000002",
    timestamp: timestamp + 10000,
  },
]);
assert.equal(repeated.incomes.length, 1);
assert.equal(repeated.paymentReviews[0].possibleDuplicateOf, "one");
assert.equal(
  resolveCapturedPayment(repeated, "ambiguous", "ignore").incomes.length,
  1,
);
const confirmed = resolveCapturedPayment(repeated, "ambiguous", "income");
assert.equal(confirmed.incomes.length, 2);
assert.equal(confirmed.paymentReviews.length, 0);
const genuine = applyCapturedPayments(first, [
  {
    ...event,
    id: "new-credit",
    reference: "REF1000003",
    balanceAfter: 6000,
    timestamp: timestamp + 20000,
  },
]);
assert.equal(genuine.incomes.length, 2);
assert.equal(genuine.paymentReviews.length, 0);
const otherAccount = applyCapturedPayments(first, [
  {
    ...event,
    id: "other-account",
    reference: "REF1000004",
    accountKey: "5678",
    timestamp: timestamp + 20000,
  },
]);
assert.equal(otherAccount.incomes.length, 2);
const otherBank = applyCapturedPayments(first, [
  {
    ...event,
    id: "other-bank",
    reference: "REF1000005",
    bankKey: "SBI",
    timestamp: timestamp + 20000,
  },
]);
assert.equal(otherBank.incomes.length, 2);
const replay = applyCapturedPayments(repeated, [
  {
    ...event,
    id: "ambiguous",
    reference: "REF1000002",
    timestamp: timestamp + 10000,
  },
]);
assert.equal(replay.paymentReviews.length, 1);
const income = [
  { id: "salary", amount: 50000, date: "2026-11-01", category: "Salary" },
  { id: "gift", amount: 1000, date: "2026-11-04", category: "Gift" },
];
const expense = [
  {
    id: "e",
    amount: 200,
    date: "2026-11-05",
    category: "Food" as const,
    paymentType: "Cash" as const,
  },
];
assert.equal(
  monthlyBalancePoints(profile, income, expense, "2026-11").at(-1),
  financeSummary({ ...base, incomes: income, expenses: expense }, "2026-11")
    .balance,
);
console.log(
  "Linked finance checks passed: personal bill selection, live/paid/reversed dues, no duplicate cash, loan schedules and monthly reserves, month-end/leap dates, paise storage, bank alert review and genuinely separate credits.",
);

// A fixed installment is budgeted once; matched previous-month cash is not extrapolated.
const oldLoan = {
  ...loan,
  firstDueDate: "2026-10-12",
  payments: [
    { id: "old-payment", date: "2026-10-12", amount: 2000, activityId: "emi" },
  ],
};
assert.equal(plannedLoanCost([oldLoan], "2026-11"), 2000);
assert.equal(
  plannedLoanCost(
    [{ ...oldLoan, payments: [{ ...oldLoan.payments[0], amount: 4000 }] }],
    "2026-11",
  ),
  0,
);
const forecastState = {
  ...base,
  loans: [oldLoan],
  goals: [
    {
      id: "dream",
      name: "Home",
      targetAmount: 100000,
      savedAmount: 0,
      icon: "home",
      color: "#000",
    },
  ],
  expenses: [
    {
      id: "ordinary",
      date: "2026-10-02",
      amount: 10000,
      category: "Food" as const,
      paymentType: "Cash" as const,
    },
    {
      id: "emi",
      date: "2026-10-12",
      amount: 2000,
      category: "EMI" as const,
      paymentType: "Bank" as const,
    },
  ],
};
assert.equal(nextMonthSavingsPlan(forecastState, "2026-11-12").total, 7600); // 20% of 50000-10000-2000.
assert.equal(plannedLoanCost([loan], "2026-11"), 2000);
assert.equal(plannedLoanCost([loan], "2026-10"), 0);
