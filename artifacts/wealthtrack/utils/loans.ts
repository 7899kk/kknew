import type { Loan } from "./ledgerSchema";
import { localDate } from "./financeValidation";
const cents = (n: number) => Math.round(n * 100);
export function installmentDate(first: string, index: number): string {
  const [y, m, d] = first.split("-").map(Number);
  const end = new Date(y, m - 1 + index + 1, 0);
  return localDate(
    new Date(end.getFullYear(), end.getMonth(), Math.min(d, end.getDate())),
  );
}
export function loanSchedule(loan: Loan, asOf = "9999-12-31") {
  let paid = loan.payments
    .filter((p) => p.date <= asOf)
    .reduce((s, p) => s + cents(p.amount), 0);
  let remaining = cents(loan.principal);
  const schedule: {
    date: string;
    amount: number;
    remaining: number;
    paid: number;
  }[] = [];
  for (let i = 0; remaining > 0 && i < 1200; i++) {
    const amount = Math.min(remaining, cents(loan.monthlyPayment));
    if (amount <= 0) break;
    const applied = Math.min(paid, amount);
    paid -= applied;
    remaining -= amount;
    schedule.push({
      date: installmentDate(loan.firstDueDate, i),
      amount: amount / 100,
      paid: applied / 100,
      remaining: (amount - applied) / 100,
    });
  }
  return schedule;
}
export function loanSummary(loan: Loan, today = localDate()) {
  const schedule = loanSchedule(loan, today);
  const remaining =
    Math.max(
      0,
      cents(loan.principal) -
        loan.payments
          .filter((p) => p.date <= today)
          .reduce((s, p) => s + cents(p.amount), 0),
    ) / 100;
  const next = schedule.find((s) => s.remaining > 0);
  const dueThisMonth =
    schedule
      .filter((s) => s.date.startsWith(today.slice(0, 7)))
      .reduce((s, p) => s + cents(p.remaining), 0) / 100;
  const overdue =
    schedule
      .filter((s) => s.date < today)
      .reduce((s, p) => s + cents(p.remaining), 0) / 100;
  return { remaining, next, dueThisMonth, overdue, schedule };
}
export function monthlyLoanReserve(
  loans: Loan[] = [],
  month = localDate().slice(0, 7),
) {
  const [y, m] = month.split("-").map(Number);
  const end = localDate(new Date(y, m, 0));
  return (
    loans
      .filter((l) => l.kind === "borrowed")
      .reduce(
        (sum, l) =>
          sum +
          loanSchedule(l, end)
            .filter((s) => s.date <= end)
            .reduce((s, p) => s + cents(p.remaining), 0),
        0,
      ) / 100
  );
}

/** Cash installments planned for a target month, plus unpaid amounts carried in. */
export function plannedLoanCost(
  loans: Loan[] = [],
  month = localDate().slice(0, 7),
) {
  const [y, m] = month.split("-").map(Number),
    before = localDate(new Date(y, m - 1, 0)),
    end = localDate(new Date(y, m, 0)),
    start = month + "-01";
  return (
    loans
      .filter((l) => l.kind === "borrowed")
      .reduce((sum, l) => {
        const scheduled = loanSchedule(l, before)
          .filter((s) => s.date.startsWith(month))
          .reduce((n, s) => n + cents(s.remaining), 0);
        const overdue = loanSchedule(l, end)
          .filter((s) => s.date < start)
          .reduce((n, s) => n + cents(s.remaining), 0);
        return sum + scheduled + overdue;
      }, 0) / 100
  );
}
