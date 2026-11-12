import { z } from "zod";
export type CapturedPayment = {
  id: string;
  amount: number;
  kind: "expense" | "income" | "transfer" | "review";
  source: string;
  timestamp: number;
  reference?: string | null;
  conflict?: boolean;
  bankKey?: string;
  accountKey?: string;
  balanceAfter?: number;
  possibleDuplicateOf?: string;
  directionHint?: "income" | "expense";
};
export type DebitReasonReply = {
  id: string;
  kind: "reason";
  captureId: string;
  reason: string;
  timestamp: number;
};
export type PaymentEvent = CapturedPayment | DebitReasonReply;
export const sourceNames: Record<string, string> = {
  "com.phonepe.app": "PhonePe",
  "net.one97.paytm": "Paytm",
  "com.google.android.apps.nbu.paisa.user": "Google Pay",
  "in.org.npci.upiapp": "BHIM",
  "com.sbi.SBIFreedomPlus": "SBI",
  "com.csam.icici.bank.imobile": "ICICI",
  "com.snapwork.hdfc": "HDFC",
  "com.axis.mobile": "Axis",
};

const eventId = z.string().min(1).max(200);
export const paymentEventSchema = z.union([
  z.object({
    id: eventId,
    kind: z.literal("reason"),
    captureId: eventId,
    reason: z.string().trim().min(1).max(200),
    timestamp: z.number().finite(),
  }),
  z.object({
    id: eventId,
    amount: z
      .number()
      .finite()
      .positive()
      .max(1e12)
      .refine((n) => Number(n.toFixed(2)) === n),
    kind: z.enum(["expense", "income", "transfer", "review"]),
    source: z.string().min(1).max(200),
    timestamp: z
      .number()
      .finite()
      .refine((n) => Number.isFinite(new Date(n).getTime())),
    reference: z.string().max(100).nullable().optional(),
    conflict: z.boolean().optional(),
    bankKey: z.string().max(100).optional(),
    accountKey: z.string().max(100).optional(),
    balanceAfter: z.number().finite().nonnegative().max(1e12).optional(),
    possibleDuplicateOf: eventId.optional(),
    directionHint: z.enum(["income", "expense"]).optional(),
  }),
]);
export function parsePaymentBatch(raw: string): PaymentEvent[] {
  if (raw.length > 5 * 1024 * 1024)
    throw Error("Capture queue exceeds the import limit");
  const rows = z.array(z.unknown()).max(2000).parse(JSON.parse(raw));
  // Invalid events are retained in the native queue and surface as a sync error.
  return rows.map((row) => paymentEventSchema.parse(row));
}

export function inspectPaymentBatch(raw: string): {
  events: PaymentEvent[];
  rejected: number;
} {
  if (raw.length > 5 * 1024 * 1024)
    throw Error("Capture queue exceeds the import limit");
  const rows = z.array(z.unknown()).max(2000).parse(JSON.parse(raw));
  const events: PaymentEvent[] = [];
  let rejected = 0;
  for (const row of rows) {
    const result = paymentEventSchema.safeParse(row);
    if (result.success) events.push(result.data);
    else rejected++;
  }
  return { events, rejected };
}
