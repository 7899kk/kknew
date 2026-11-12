import { selectNewPaymentReceipt } from "../utils/paymentReceipt";
import assert from "node:assert/strict";
import { spendingComparison } from "../utils/reports";
import { transactionDateLabel } from "../utils/transactionDetails";
import { applyCapturedPayments } from "../utils/capturedPayments";
import type {
  Expense,
  IncomeEntry,
  PaymentReview,
} from "../context/AppContext";
const exp = (
  id: string,
  date: string,
  amount: number,
  category: Expense["category"] = "Food",
): Expense => ({ id, date, amount, category, paymentType: "Cash" });
const today = new Date(2026, 10, 11, 16, 30);
const entries = [
  exp("a", "2026-11-05", 1500),
  exp("b", "2026-10-05", 1000),
  exp("c", "2026-10-20", 9000),
];
const current = spendingComparison("2026-11", entries, today);
assert.equal(current.difference, 500);
assert.equal(current.percent, 50);
assert.match(current.message, /₹500 more \(50%\)/);
assert.equal(current.previous, 1000);
assert.equal(
  spendingComparison(
    "2026-11",
    [exp("a", "2026-11-01", 500), exp("b", "2026-10-01", 1000)],
    today,
  ).percent,
  50,
);
assert.match(
  spendingComparison("2026-11", [exp("a", "2026-10-01", 1000)], today).message,
  /less \(100%\)/,
);
assert.match(
  spendingComparison("2026-11", [], today).message,
  /No expenses recorded/,
);
assert.match(
  spendingComparison(
    "2026-11",
    [exp("a", "2026-11-01", 1000), exp("b", "2026-10-01", 1000)],
    today,
  ).message,
  /same/,
);
assert.equal(
  spendingComparison("2026-01", [exp("a", "2025-12-31", 200)], today).previous,
  200,
);
assert.equal(
  spendingComparison(
    "2026-03",
    [exp("a", "2026-02-28", 200)],
    new Date(2026, 2, 31),
  ).previous,
  200,
);
assert.match(transactionDateLabel("2026-11-11", "16:05"), /Wednesday/);
assert.match(transactionDateLabel("2026-11-11", "16:05"), /4:05 PM/);
assert.match(transactionDateLabel("2026-11-11"), /Time not recorded/);
const empty: {
  expenses: Expense[];
  incomes: IncomeEntry[];
  paymentReviews: PaymentReview[];
  capturedIds: string[];
} = { expenses: [], incomes: [], paymentReviews: [], capturedIds: [] };
const timestamp = today.getTime();
const captured = applyCapturedPayments(empty, [
  {
    id: "credit",
    amount: 500,
    kind: "income",
    timestamp,
    source: "com.phonepe.app",
    reference: "CREDIT123",
  },
  {
    id: "debit",
    amount: 100,
    kind: "expense",
    timestamp,
    source: "com.phonepe.app",
    reference: "DEBIT123",
  },
]);
assert.equal(captured.incomes[0].timestamp, timestamp);
assert.equal(captured.incomes[0].time, "16:30");
assert.equal(captured.expenses[0].timestamp, timestamp);
assert.equal(captured.expenses[0].time, "16:30");
console.log(
  "Payment experience checks passed: captured credit/debit timestamps, readable weekday/date/time, fair month-to-date comparisons, percentage differences, missing history and year/month boundaries.",
);

assert.equal(
  selectNewPaymentReceipt([], captured.expenses, captured.incomes)?.amount,
  100,
);
assert.equal(
  selectNewPaymentReceipt(
    ["credit", "debit"],
    captured.expenses,
    captured.incomes,
  ),
  null,
);
assert.equal(
  selectNewPaymentReceipt(["debit"], captured.expenses, captured.incomes)?.kind,
  "income",
);

const sms = applyCapturedPayments(empty, [
  {
    id: "sms-debit",
    kind: "expense",
    amount: 1500,
    source: "sms:VM-HDFCBK",
    timestamp,
    reference: "SMS123456",
  },
  {
    id: "sms-credit",
    kind: "income",
    amount: 10000,
    source: "sms:AD-SBIINB",
    timestamp,
  },
  {
    id: "sms-unknown",
    kind: "review",
    amount: 200,
    source: "sms:+919876543210",
    timestamp,
  },
]);
assert.equal(sms.expenses.length, 1);
assert.equal(sms.incomes.length, 1);
assert.equal(sms.paymentReviews.length, 1);
assert.equal(sms.expenses[0].paymentType, "Bank");
assert.equal(sms.expenses[0].source, "Bank SMS · VM-HDFCBK");
assert.equal(sms.expenses[0].time, "16:30");
const replaySms = applyCapturedPayments(sms, [
  {
    id: "sms-debit",
    kind: "expense",
    amount: 1500,
    source: "sms:VM-HDFCBK",
    timestamp,
    reference: "SMS123456",
  },
]);
assert.equal(replaySms.expenses.length, 1);
console.log(
  "SMS ledger import checks passed: timestamp, bank source, debit/credit separation, review exclusion and replay.",
);
