/** Fixed-rate reducing-balance estimate. Actual lender fees and rate changes are excluded. */
export function loanTermsPlan(
  amount: number,
  annualRate: number,
  months: number,
  actualMonthly?: number,
) {
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 1e12 ||
    Number(amount.toFixed(2)) !== amount ||
    !Number.isFinite(annualRate) ||
    annualRate < 0 ||
    annualRate > 100 ||
    !Number.isInteger(months) ||
    months < 1 ||
    months > 1200
  )
    throw Error(
      "Enter a positive loan, annual interest from 0 to 100%, and 1–1200 months.",
    );
  const cents = (n: number) => Math.round(n * 100),
    rate = annualRate / 1200,
    original = cents(amount);
  const recommended = rate
    ? cents((amount * rate) / -Math.expm1(-months * Math.log1p(rate)))
    : Math.ceil(original / months);
  const payment =
    actualMonthly === undefined ? recommended : cents(actualMonthly);
  if (
    actualMonthly !== undefined &&
    (!Number.isFinite(actualMonthly) ||
      actualMonthly > 1e12 ||
      Number(actualMonthly.toFixed(2)) !== actualMonthly)
  )
    throw Error("Enter a monthly payment with at most two decimal places.");
  if (
    !Number.isFinite(payment) ||
    payment < 1 ||
    (payment <= Math.round(original * rate) && months > 1)
  )
    throw Error("Monthly payment must cover the interest and reduce the loan.");
  let remaining = original,
    totalInterest = 0;
  const installments: {
    amount: number;
    interest: number;
    principal: number;
    balance: number;
  }[] = [];
  for (let i = 0; i < months && remaining > 0; i++) {
    const interest = Math.round(remaining * rate),
      due = remaining + interest;
    const paid = i === months - 1 ? due : Math.min(due, payment);
    remaining -= paid - interest;
    totalInterest += interest;
    installments.push({
      amount: paid / 100,
      interest: interest / 100,
      principal: (paid - interest) / 100,
      balance: remaining / 100,
    });
  }
  const total = (original + totalInterest) / 100;
  if (total > 1e12) throw Error("Total repayment is too large.");
  return {
    recommended: recommended / 100,
    monthly: payment / 100,
    total,
    interest: totalInterest / 100,
    installments,
    finalPayment: installments.at(-1)?.amount || 0,
  };
}
