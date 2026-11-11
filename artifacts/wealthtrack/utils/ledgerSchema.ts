import { z } from "zod";
export const categories = [
  "Food",
  "Travel",
  "Rent",
  "EMI",
  "Shopping",
  "Entertainment",
  "Medical",
  "Education",
  "Others",
] as const;
export const money = z
  .number()
  .finite()
  .min(0)
  .max(1e12)
  .refine((n) => Number(n.toFixed(2)) === n, "Use at most two decimal places");
export const positiveMoney = money.refine((n) => n > 0);
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const [y, m, d] = v.split("-").map(Number);
    const t = new Date(y, m - 1, d);
    return t.getFullYear() === y && t.getMonth() === m - 1 && t.getDate() === d;
  });
const id = z.string().min(1).max(200),
  text = z.string().max(500),
  optionalText = text.optional();
export const expenseSchema = z.object({
  id,
  date,
  time: optionalText,
  timestamp: z.number().finite().optional(),
  category: z.enum(categories),
  amount: positiveMoney,
  paymentType: z.enum(["Cash", "UPI", "Card", "Bank"]),
  notes: optionalText,
  merchant: optionalText,
  upiRef: optionalText,
  captureId: id.optional(),
  source: optionalText,
  needsReason: z.boolean().optional(),
});
export const incomeSchema = z.object({
  id,
  date,
  amount: positiveMoney,
  notes: optionalText,
  name: optionalText,
  category: optionalText,
  source: optionalText,
  captureId: id.optional(),
  reference: z.string().max(100).nullable().optional(),
  time: optionalText,
  timestamp: z.number().finite().optional(),
});
export const billExpenseSchema = z.object({
  id,
  description: text.min(1),
  amount: positiveMoney,
  paidBy: id,
  splitAmong: z.array(id).min(1).max(100),
  date,
});
export const repaymentSchema = z
  .object({
    id,
    from: id,
    to: id,
    amount: positiveMoney,
    date,
    reversedAt: z.string().optional(),
  })
  .refine((r) => r.from !== r.to);
export const proposalSchema = z
  .object({
    id,
    groupId: id,
    baseRevision: z.number().int().nonnegative(),
    claimedMember: id,
    kind: z.enum(["expense", "repayment"]),
    expense: billExpenseSchema.optional(),
    repayment: repaymentSchema.optional(),
  })
  .refine((p) =>
    p.kind === "expense"
      ? !!p.expense && !p.repayment
      : !!p.repayment && !p.expense,
  );
export type Repayment = z.infer<typeof repaymentSchema>;
export type GroupProposal = z.infer<typeof proposalSchema>;
export const groupSchema = z
  .object({
    id,
    name: text.min(1),
    members: z.array(id).min(2).max(100),
    expenses: z.array(billExpenseSchema).max(10000),
    createdAt: z.string(),
    organizerId: id.optional(),
    memberIds: z.record(id).optional(),
    revision: z.number().int().nonnegative().optional(),
    readOnly: z.boolean().optional(),
    repayments: z.array(repaymentSchema).optional(),
    proposals: z.array(proposalSchema).optional(),
    handledProposalIds: z.array(id).optional(),
  })
  .superRefine((g, c) => {
    if (new Set(g.members).size !== g.members.length)
      c.addIssue({ code: "custom", message: "Duplicate members" });
    if (
      g.memberIds &&
      (Object.keys(g.memberIds).length !== g.members.length ||
        g.members.some((m) => !g.memberIds![m]) ||
        new Set(Object.values(g.memberIds)).size !== g.members.length)
    )
      c.addIssue({ code: "custom", message: "Invalid member identities" });
    for (const e of g.expenses)
      if (
        !g.members.includes(e.paidBy) ||
        e.splitAmong.some((m) => !g.members.includes(m)) ||
        new Set(e.splitAmong).size !== e.splitAmong.length
      )
        c.addIssue({
          code: "custom",
          message: "Unknown or duplicate participant",
        });
    for (const r of g.repayments || [])
      if (!g.members.includes(r.from) || !g.members.includes(r.to))
        c.addIssue({ code: "custom", message: "Unknown repayment member" });
    for (const key of ["expenses", "repayments", "proposals"] as const) {
      const rows = g[key] || [];
      if (new Set(rows.map((r) => r.id)).size !== rows.length)
        c.addIssue({ code: "custom", message: "Duplicate group record" });
    }
  });
export const budgetSchema = z.object({
  id,
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  category: z.enum(categories),
  limit: positiveMoney,
});
export type Budget = z.infer<typeof budgetSchema>;
export const ledgerSchema = z
  .object({
    profile: z.object({
      name: text,
      username: text,
      profilePhoto: z.string().max(100000).optional(),
      monthlySalary: money,
      yearlySalary: money,
      otherIncome: money,
      currentSavings: money,
      onboardingComplete: z.boolean(),
    }),
    expenses: z.array(expenseSchema),
    incomes: z.array(incomeSchema),
    capturedIds: z.array(id),
    paymentReviews: z.array(
      z.object({
        id,
        amount: positiveMoney,
        kind: z.enum(["review", "transfer"]),
        status: z.enum(["review", "transfer"]),
        source: text,
        timestamp: z
          .number()
          .finite()
          .refine((n) => Number.isFinite(new Date(n).getTime())),
        reference: z.string().nullable().optional(),
        conflict: z.boolean().optional(),
      }),
    ),
    autoExpenses: z.array(
      z.object({
        id,
        description: text,
        category: z.enum(categories),
        amount: positiveMoney,
        paymentType: z.enum(["Cash", "UPI", "Card", "Bank"]),
        isActive: z.boolean(),
      }),
    ),
    debts: z.array(
      z.object({
        id,
        name: text,
        amount: positiveMoney,
        interest: money.optional(),
        dueDate: date.optional(),
        status: z.enum(["Paid", "Pending"]),
        type: z.enum(["debit", "credit"]),
      }),
    ),
    stocks: z.array(
      z.object({
        id,
        company: text,
        symbol: text,
        quantity: z.number().finite().nonnegative(),
        buyPrice: z.number().finite().nonnegative().max(1e12),
        currentPrice: z.number().finite().nonnegative().max(1e12),
        purchaseDate: date.optional(),
        exchange: z.enum(["NSE", "BSE", "NYSE", "NASDAQ", "Other"]).optional(),
      }),
    ),
    cryptos: z.array(
      z.object({
        id,
        coin: text,
        quantity: z.number().finite().nonnegative(),
        buyPrice: z.number().finite().nonnegative().max(1e12),
        currentPrice: z.number().finite().nonnegative().max(1e12),
        purchaseDate: date.optional(),
      }),
    ),
    goldSilver: z.array(
      z.object({
        id,
        type: z.enum(["Gold", "Silver"]),
        assetName: text,
        quantity: z.number().finite().nonnegative(),
        buyPrice: z.number().finite().nonnegative().max(1e12),
        currentPrice: z.number().finite().nonnegative().max(1e12),
        purchaseDate: date.optional(),
        purity: optionalText,
      }),
    ),
    goals: z.array(
      z
        .object({
          id,
          name: text,
          targetAmount: positiveMoney,
          savedAmount: money,
          targetDate: date.optional(),
          description: optionalText,
          emoji: optionalText,
          category: z
            .enum(["Bike", "Car", "Flat", "Emergency", "Custom"])
            .optional(),
        })
        .refine((g) => g.savedAmount <= g.targetAmount),
    ),
    billGroups: z.array(groupSchema),
    budgets: z.array(budgetSchema).default([]),
    deviceId: id.optional(),
  })
  .superRefine((s, c) => {
    for (const key of [
      "expenses",
      "incomes",
      "autoExpenses",
      "debts",
      "stocks",
      "cryptos",
      "goldSilver",
      "goals",
      "billGroups",
      "budgets",
    ] as const) {
      if (new Set(s[key].map((x) => x.id)).size !== s[key].length)
        c.addIssue({ code: "custom", message: "Duplicate record IDs" });
    }
    if (
      new Set(s.budgets.map((b) => b.month + ":" + b.category)).size !==
      s.budgets.length
    )
      c.addIssue({ code: "custom", message: "Duplicate budgets" });
  });
export type Ledger = z.infer<typeof ledgerSchema>;
// Public forms retain rupees; persisted monetary fields are integer paise.
const monetaryKeys = new Set([
  "amount",
  "monthlySalary",
  "yearlySalary",
  "otherIncome",
  "currentSavings",
  "targetAmount",
  "savedAmount",
  "limit",
]);
function convert(value: unknown, encode: boolean): unknown {
  if (Array.isArray(value)) return value.map((v) => convert(v, encode));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        typeof v === "number" && monetaryKeys.has(k)
          ? encode
            ? Math.round(v * 100)
            : v / 100
          : convert(v, encode),
      ]),
    );
  return value;
}
export function encodeLedger(value: unknown) {
  return JSON.stringify({
    version: 1,
    unit: "paise",
    ledger: convert(ledgerSchema.parse(value), true),
  });
}
export function decodeLedger(raw: string) {
  const v = JSON.parse(raw);
  if (v.version !== 1 || v.unit !== "paise")
    throw Error("Unsupported ledger version");
  return ledgerSchema.parse(convert(v.ledger, false));
}
