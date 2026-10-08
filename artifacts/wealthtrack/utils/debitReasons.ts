import type { Expense, ExpenseCategory } from '../context/AppContext';

export const expenseCategories: ExpenseCategory[] = ['Food','Travel','Rent','EMI','Shopping','Entertainment','Medical','Education','Others'];

export function pendingDebitReasons(expenses: Expense[]): Expense[] {
  return expenses.filter(entry => !!entry.captureId && entry.needsReason === true);
}

// Update the existing entry: naming a debit must never count it twice.
export function debitReasonDetails(reason: string, category: ExpenseCategory): Pick<Expense,'notes'|'category'|'needsReason'> | null {
  const notes = reason.trim();
  if (!notes || notes.length > 200 || !expenseCategories.includes(category)) return null;
  return { notes, category, needsReason:false };
}
