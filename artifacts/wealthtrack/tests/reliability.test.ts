import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import {
  ledgerSchema,
  decodeLedger,
  encodeLedger,
  groupSchema,
} from "../utils/ledgerSchema";
import { LEDGER_SQL, writeSQLLedger, readSQLLedger } from "../utils/sqlLedger";
import type { LedgerDatabase, LedgerTransaction } from "../utils/sqlLedger";
import { encryptBackup, decryptBackup } from "../utils/backup";
import {
  parseSharedFile,
  snapshot,
  importShared,
  decideProposal,
} from "../utils/groupSharing";
import { calculateSettlements } from "../utils/billSettlements";
import { monthlyReport } from "../utils/reports";
import {
  applyCapturedPayments,
  resolveCapturedPayment,
} from "../utils/capturedPayments";
import { parsePaymentBatch } from "../utils/paymentModels";
import type { BillGroup } from "../context/AppContext";

const base = ledgerSchema.parse({
  profile: {
    name: "Household",
    username: "",
    monthlySalary: 50000,
    yearlySalary: 600000,
    otherIncome: 0,
    currentSavings: 20000,
    onboardingComplete: true,
  },
  incomes: [],
  expenses: [
    {
      id: "e",
      amount: 100.01,
      date: "2026-12-31",
      category: "Food",
      paymentType: "Cash",
    },
  ],
  autoExpenses: [],
  debts: [],
  stocks: [],
  cryptos: [],
  goldSilver: [],
  goals: [{ id: "goal", name: "Bike", targetAmount: 5000, savedAmount: 1000 }],
  billGroups: [],
  paymentReviews: [],
  capturedIds: ["captured"],
  deviceId: "owner",
});
const encoded = encodeLedger(base);
assert.equal(JSON.parse(encoded).ledger.expenses[0].amount, 10001);
assert.deepEqual(decodeLedger(encoded), base);
assert.throws(() => decodeLedger('{"version":2}'));
assert.throws(() =>
  ledgerSchema.parse({
    ...base,
    expenses: [{ ...base.expenses[0], amount: NaN }],
  }),
);
assert.throws(() =>
  ledgerSchema.parse({
    ...base,
    expenses: [{ ...base.expenses[0], date: "2026-02-30" }],
  }),
);
assert.throws(() =>
  ledgerSchema.parse({
    ...base,
    expenses: [base.expenses[0], base.expenses[0]],
  }),
);
assert.throws(() =>
  ledgerSchema.parse({
    ...base,
    goals: [{ ...base.goals[0], savedAmount: 5001 }],
  }),
);

// Actual SQLite transactions, including a failure after the ledger write but before event IDs commit.
const native = new DatabaseSync(":memory:");
native.exec(LEDGER_SQL);
let fail = false;
const db: LedgerDatabase = {
  async getFirstAsync<T>(sql: string) {
    return (native.prepare(sql).get() as T) || null;
  },
  async withExclusiveTransactionAsync(
    fn: (tx: LedgerTransaction) => Promise<void>,
  ) {
    native.exec("BEGIN IMMEDIATE");
    try {
      await fn({
        async runAsync(sql: string, ...params: string[]) {
          if (
            fail &&
            sql.includes("processed_capture") &&
            sql.startsWith("INSERT")
          )
            throw Error("Simulated disk failure");
          native.prepare(sql).run(...params);
        },
      });
      native.exec("COMMIT");
    } catch (e) {
      native.exec("ROLLBACK");
      throw e;
    }
  },
};
await writeSQLLedger(db, base);
const updated = {
  ...base,
  capturedIds: ["captured", "new"],
  expenses: [
    ...base.expenses,
    { ...base.expenses[0], id: "e2", amount: 12.34 },
  ],
};
fail = true;
await assert.rejects(writeSQLLedger(db, updated, true));
assert.deepEqual(await readSQLLedger(db), base);
assert.equal(await readSQLLedger(db, true), null);
assert.equal(
  native.prepare("SELECT COUNT(*) AS n FROM processed_capture").get()?.n,
  1,
);
fail = false;
await writeSQLLedger(db, updated, true);
assert.deepEqual(await readSQLLedger(db, true), base);
assert.deepEqual(await readSQLLedger(db), updated);
await writeSQLLedger(db, updated);
assert.equal(
  native.prepare("SELECT COUNT(*) AS n FROM processed_capture").get()?.n,
  2,
);
native.close();

const group: BillGroup = {
  id: "group",
  name: "Trip",
  members: ["A", "B", "C"],
  memberIds: { A: "ma", B: "mb", C: "mc" },
  organizerId: "owner",
  revision: 1,
  createdAt: "2026-12-31",
  expenses: [
    {
      id: "dinner",
      description: "Dinner",
      amount: 100,
      paidBy: "A",
      splitAmong: ["A", "B", "C"],
      date: "2026-12-31",
    },
  ],
  repayments: [],
  proposals: [],
  handledProposalIds: [],
};
assert.deepEqual(calculateSettlements(group), [
  { from: "B", to: "A", amount: 33.33 },
  { from: "C", to: "A", amount: 33.33 },
]);
const paid = {
  ...group,
  repayments: [
    { id: "paid", from: "B", to: "A", amount: 10, date: "2026-12-31" },
  ],
};
assert.equal(
  calculateSettlements(paid).find((s) => s.from === "B")?.amount,
  23.33,
);
const reversed = {
  ...paid,
  repayments: [{ ...paid.repayments[0], reversedAt: "2027-01-01" }],
};
assert.deepEqual(calculateSettlements(reversed), calculateSettlements(group));
const shared = parseSharedFile(JSON.stringify(snapshot(group)));
const imported = importShared([], shared);
assert.equal(imported[0].readOnly, true);
assert.throws(() => importShared(imported, shared));
assert.throws(() => importShared([group], shared));
assert.throws(() =>
  parseSharedFile(JSON.stringify({ ...snapshot(group), version: 99 })),
);
assert.throws(() =>
  parseSharedFile(
    JSON.stringify({
      ...snapshot(group),
      group: { ...group, members: ["A", "A"] },
    }),
  ),
);
assert.throws(() => parseSharedFile(" ".repeat(5 * 1024 * 1024 + 1)));
const proposal = {
  id: "p",
  groupId: "group",
  baseRevision: 1,
  claimedMember: "mb",
  kind: "repayment" as const,
  repayment: {
    id: "repayment",
    from: "B",
    to: "A",
    amount: 33.33,
    date: "2026-12-31",
  },
};
const proposalFile = parseSharedFile(
  JSON.stringify({
    format: "profinancer-group",
    version: 1,
    type: "proposal",
    proposal,
  }),
);
const pending = importShared([group], proposalFile)[0];
assert.deepEqual(calculateSettlements(pending), calculateSettlements(group));
assert.throws(() => importShared([pending], proposalFile));
const approved = decideProposal(pending, proposal, true, "B");
assert.equal(approved.revision, 2);
assert.equal(
  calculateSettlements(approved).some((s) => s.from === "B"),
  false,
);
assert.throws(() => decideProposal(approved, proposal, true, "B"));
assert.throws(() => importShared([approved], proposalFile));
assert.throws(() =>
  decideProposal({ ...pending, readOnly: true }, proposal, true, "B"),
);
assert.throws(() =>
  decideProposal(
    pending,
    { ...proposal, repayment: { ...proposal.repayment, amount: 34 } },
    true,
    "B",
  ),
);
const rejected = decideProposal(pending, proposal, false, "");
assert.deepEqual(calculateSettlements(rejected), calculateSettlements(group));
assert.throws(() => importShared([rejected], proposalFile));
assert.throws(() =>
  groupSchema.parse({
    ...group,
    expenses: [{ ...group.expenses[0], paidBy: "stranger" }],
  }),
);
const nextSnapshot = parseSharedFile(JSON.stringify(snapshot(approved)));
assert.equal(importShared(imported, nextSnapshot)[0].revision, 2);
const expenseProposal = {
  id: "expenseProposal",
  groupId: "group",
  baseRevision: 0,
  claimedMember: "mb",
  kind: "expense" as const,
  expense: {
    id: "hotel",
    description: "Hotel",
    amount: 300,
    paidBy: "B",
    splitAmong: ["A", "B"],
    date: "2027-01-01",
  },
};
const expPending = importShared(
  [group],
  parseSharedFile(
    JSON.stringify({
      format: "profinancer-group",
      version: 1,
      type: "proposal",
      proposal: expenseProposal,
    }),
  ),
)[0];
assert.equal(
  decideProposal(expPending, expenseProposal, true, "C").expenses[1].paidBy,
  "C",
);

const budgets = [
  { id: "budget", month: "2026-12", category: "Food" as const, limit: 100 },
];
const report = monthlyReport(
  "2026-12",
  base.profile,
  base.incomes,
  base.expenses,
  budgets,
);
assert.equal(report.budgets[0].remaining, -0.01);
assert.equal(report.expenses, 100.01);
assert.equal(
  monthlyReport("2027-01", base.profile, [], base.expenses, budgets).expenses,
  0,
);
assert.equal(
  monthlyReport(
    "2026-12",
    base.profile,
    [],
    [{ ...base.expenses[0], amount: 50 }],
    budgets,
  ).budgets[0].remaining,
  50,
);

const empty = {
  expenses: [],
  incomes: [],
  paymentReviews: [],
  capturedIds: [],
} as Pick<
  typeof base,
  "expenses" | "incomes" | "paymentReviews" | "capturedIds"
>;
const debit = {
  id: "first",
  amount: 100,
  kind: "expense" as const,
  source: "com.phonepe.app",
  timestamp: Date.now(),
  reference: "REF123456",
};
const first = applyCapturedPayments(empty, [debit]);
const duplicate = applyCapturedPayments(first, [
  { ...debit, id: "second", source: "com.sbi.SBIFreedomPlus" },
]);
assert.equal(duplicate.expenses.length, 1);
const conflict = applyCapturedPayments(first, [
  { ...debit, id: "conflict", kind: "income" },
]);
assert.equal(conflict.expenses.length, 0);
assert.equal(conflict.incomes.length, 0);
assert.equal(conflict.paymentReviews.length, 2);
const resolved = resolveCapturedPayment(conflict, "first", "expense");
assert.equal(resolved.expenses.length, 1);
assert.equal(resolved.paymentReviews.length, 0);
assert.equal(
  applyCapturedPayments(resolved, [
    { ...debit, id: "conflict", kind: "income" },
  ]),
  resolved,
);
assert.equal(
  applyCapturedPayments(empty, [{ ...debit, amount: 0.001 }]),
  empty,
);
assert.throws(() =>
  parsePaymentBatch(JSON.stringify([{ ...debit, kind: "unknown" }])),
);
assert.throws(() => parsePaymentBatch('[{"id":"bad"}]'));
assert.equal(parsePaymentBatch(JSON.stringify([debit])).length, 1);

const password = "a long test password";
const backup = await encryptBackup(
  { ...base, billGroups: [approved], budgets },
  password,
  (n) => randomBytes(n),
);
assert.equal(backup.includes("Household"), false);
assert.equal(backup.includes("Dinner"), false);
assert.deepEqual(
  await decryptBackup(backup, password),
  ledgerSchema.parse({ ...base, billGroups: [approved], budgets }),
);
await assert.rejects(decryptBackup(backup, "wrong password"));
const tampered = JSON.parse(backup);
tampered.ciphertext = "00" + tampered.ciphertext.slice(2);
await assert.rejects(decryptBackup(JSON.stringify(tampered), password));
await assert.rejects(
  decryptBackup(
    JSON.stringify({ ...JSON.parse(backup), iterations: 1 }),
    password,
  ),
);
await assert.rejects(encryptBackup(base, "short", (n) => randomBytes(n)));
console.log(
  "Reliability checks passed: paise migration/schema, SQLite rollback and recovery, shared snapshots and proposal approval/replay, partial/full/reversed repayments, budget boundaries, cross-source capture conflicts, encrypted backup round trips and corruption.",
);
