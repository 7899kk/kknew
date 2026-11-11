import { z } from "zod";
import { groupSchema, proposalSchema } from "./ledgerSchema";
import type { GroupProposal } from "./ledgerSchema";
import type { BillGroup } from "../context/AppContext";
import { calculateSettlements } from "./billSettlements";
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const sharedFileSchema = z.discriminatedUnion("type", [
  z.object({
    format: z.literal("profinancer-group"),
    version: z.literal(1),
    type: z.literal("snapshot"),
    group: groupSchema,
  }),
  z.object({
    format: z.literal("profinancer-group"),
    version: z.literal(1),
    type: z.literal("proposal"),
    proposal: proposalSchema,
  }),
]);
export type SharedFile = z.infer<typeof sharedFileSchema>;
export function parseSharedFile(raw: string): SharedFile {
  if (new TextEncoder().encode(raw).length > MAX_FILE_BYTES)
    throw Error("File exceeds 5 MB");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw Error("This is not a valid group file.");
  }
  const parsed = sharedFileSchema.safeParse(value);
  if (!parsed.success)
    throw Error(
      "Unsupported or invalid group file. Ask the organizer to export a new file.",
    );
  return parsed.data;
}
export function snapshot(group: BillGroup) {
  return {
    format: "profinancer-group" as const,
    version: 1 as const,
    type: "snapshot" as const,
    group: { ...group, readOnly: true, proposals: [] },
  };
}
export function importShared(
  groups: BillGroup[],
  file: SharedFile,
): BillGroup[] {
  if (file.type === "snapshot") {
    const incoming = file.group;
    const existing = groups.find((g) => g.id === incoming.id);
    if (existing && !existing.readOnly)
      throw Error(
        "Cannot replace a group you organize with a shared snapshot.",
      );
    if (existing && existing.organizerId !== incoming.organizerId)
      throw Error("The organizer does not match this group.");
    if (existing && (existing.revision || 0) >= (incoming.revision || 0))
      throw Error("This snapshot is already imported or older than your copy.");
    const next = {
      ...incoming,
      readOnly: true,
      proposals: (existing?.proposals || []).filter(
        (p) => !(incoming.handledProposalIds || []).includes(p.id),
      ),
    };
    return existing
      ? groups.map((g) => (g.id === next.id ? next : g))
      : [next, ...groups];
  }
  const p = file.proposal,
    g = groups.find((g) => g.id === p.groupId);
  if (!g || g.readOnly)
    throw Error("Import proposals on the organizer’s phone.");
  if (p.baseRevision > (g.revision || 0))
    throw Error("Proposal refers to a newer group revision.");
  if (
    (g.handledProposalIds || []).includes(p.id) ||
    (g.proposals || []).some((x) => x.id === p.id)
  )
    throw Error("Proposal already received or handled.");
  return groups.map((x) =>
    x.id === g.id ? { ...g, proposals: [...(g.proposals || []), p] } : x,
  );
}
export function decideProposal(
  g: BillGroup,
  p: GroupProposal,
  accept: boolean,
  mappedMember: string,
): BillGroup {
  if (g.readOnly) throw Error("Only the organizer can approve proposals.");
  if (
    !g.proposals?.some((x) => x.id === p.id) ||
    (g.handledProposalIds || []).includes(p.id)
  )
    throw Error("Proposal already handled.");
  let next = {
    ...g,
    proposals: g.proposals.filter((x) => x.id !== p.id),
    handledProposalIds: [...(g.handledProposalIds || []), p.id],
  };
  if (!accept) return next;
  if (!g.members.includes(mappedMember))
    throw Error("Choose a known group member.");
  if (p.kind === "expense" && p.expense) {
    if (g.expenses.some((e) => e.id === p.expense!.id))
      throw Error("Expense already exists.");
    next = {
      ...next,
      expenses: [...g.expenses, { ...p.expense, paidBy: mappedMember }],
    };
  } else if (p.repayment) {
    if (g.repayments?.some((r) => r.id === p.repayment!.id))
      throw Error("Repayment already exists.");
    const { reversedAt: _ignored, ...submitted } = p.repayment;
    const r = { ...submitted, from: mappedMember };
    const due =
      calculateSettlements(g).find((s) => s.from === r.from && s.to === r.to)
        ?.amount || 0;
    if (r.amount > due)
      throw Error("Repayment exceeds the current suggested settlement.");
    next = { ...next, repayments: [...(g.repayments || []), r] };
  }
  groupSchema.parse(next);
  return { ...next, revision: (g.revision || 0) + 1 };
}
export function groupSummary(g: BillGroup) {
  return (
    `${g.name} · revision ${g.revision || 0}\n${g.expenses.length} expenses\n` +
    calculateSettlements(g)
      .map((s) => `${s.from} owes ${s.to}: ₹${s.amount.toFixed(2)}`)
      .join("\n") +
    "\nReported repayments only; no bank verification."
  );
}
