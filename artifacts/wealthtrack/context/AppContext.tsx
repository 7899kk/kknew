import { correctTransactionDirection } from "@/utils/transactionDirection";
import { paymentReminders } from "@/utils/paymentReminders";
import { linkedObligations, localGroupMember } from "@/utils/obligations";
import type { Obligation } from "@/utils/obligations";
import { loanSchema } from "@/utils/ledgerSchema";
import type { Loan, LoanPayment } from "@/utils/ledgerSchema";
import { localDate } from "@/utils/financeValidation";
import { selectNewPaymentReceipt } from "@/utils/paymentReceipt";
import type { PaymentReceipt } from "@/utils/paymentReceipt";
import { StorageRecovery } from "@/components/StorageRecovery";
import * as Crypto from "expo-crypto";
import {
  ledgerSchema,
  Budget,
  Repayment,
  GroupProposal,
} from "@/utils/ledgerSchema";
import { loadLedger, saveLedger, clearLedger } from "@/utils/ledgerStorage";
import { financeSummary, contributeToGoal } from "@/utils/financeSummary";
import { inspectPaymentBatch } from "@/utils/paymentModels";
import {
  applyCapturedPayments,
  resolveCapturedPayment,
} from "@/utils/capturedPayments";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { AppState as Lifecycle, Image, Text, View } from "react-native";
import {
  CapturedPayment,
  notificationBridge,
  sourceNames,
} from "@/utils/notificationBridge";

export type PaymentType = "Cash" | "UPI" | "Card" | "Bank";
export type ExpenseCategory =
  | "Food"
  | "Travel"
  | "Rent"
  | "EMI"
  | "Shopping"
  | "Entertainment"
  | "Medical"
  | "Education"
  | "Others";

export interface Expense {
  id: string;
  date: string;
  time?: string;
  timestamp?: number;
  category: ExpenseCategory;
  amount: number;
  paymentType: PaymentType;
  notes?: string;
  merchant?: string;
  upiRef?: string;
  captureId?: string;
  source?: string;
  needsReason?: boolean;
  bankKey?: string;
  accountKey?: string;
  balanceAfter?: number;
  directionCorrected?: boolean;
  possibleDuplicateOf?: string;
}

export interface AutoExpense {
  id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  paymentType: PaymentType;
  isActive: boolean;
}

export interface DebtEntry {
  id: string;
  name: string;
  amount: number;
  interest?: number;
  dueDate?: string;
  status: "Paid" | "Pending";
  type: "debit" | "credit";
}

export interface StockEntry {
  id: string;
  company: string;
  symbol: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  purchaseDate?: string;
  exchange?: "NSE" | "BSE" | "NYSE" | "NASDAQ" | "Other";
}

export interface CryptoEntry {
  id: string;
  coin: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  purchaseDate?: string;
}

export interface GoldSilverEntry {
  id: string;
  type: "Gold" | "Silver";
  assetName: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  purchaseDate?: string;
  purity?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  savedAmount: number;
  targetDate?: string;
  imageUri?: string;
  emoji?: string;
  category?: "Bike" | "Car" | "Flat" | "Emergency" | "Custom";
}

export interface BillGroup {
  id: string;
  name: string;
  members: string[];
  expenses: BillExpense[];
  createdAt: string;
  organizerId?: string;
  memberIds?: Record<string, string>;
  revision?: number;
  readOnly?: boolean;
  repayments?: Repayment[];
  proposals?: GroupProposal[];
  handledProposalIds?: string[];
}

export interface BillExpense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  splitAmong: string[];
  date: string;
}

export interface UserProfile {
  name: string;
  username: string;
  profilePhoto?: string;
  monthlySalary: number;
  yearlySalary: number;
  otherIncome: number;
  currentSavings: number;
  onboardingComplete: boolean;
}

export interface IncomeEntry {
  bankKey?: string;
  accountKey?: string;
  balanceAfter?: number;
  possibleDuplicateOf?: string;

  id: string;
  amount: number;
  date: string;
  notes?: string;
  name?: string;
  category?: string;
  source?: string;
  captureId?: string;
  reference?: string | null;
  time?: string;
  timestamp?: number;
  directionCorrected?: boolean;
}
export interface PaymentReview extends Omit<CapturedPayment, "kind"> {
  kind: "review" | "transfer";
  status: "review" | "transfer";
}

export interface AppState {
  remindersEnabled: boolean;
  loans: Loan[];
  groupMemberships: Record<string, string>;
  deviceId?: string;
  budgets: Budget[];
  incomes: IncomeEntry[];
  paymentReviews: PaymentReview[];
  capturedIds: string[];
  profile: UserProfile;
  expenses: Expense[];
  autoExpenses: AutoExpense[];
  debts: DebtEntry[];
  stocks: StockEntry[];
  cryptos: CryptoEntry[];
  goldSilver: GoldSilverEntry[];
  goals: SavingsGoal[];
  billGroups: BillGroup[];
}

interface AppContextType extends AppState {
  obligations: Obligation[];
  totalCredit: number;
  monthlyLoanPayments: number;
  setRemindersEnabled: (value: boolean) => void;
  setGroupMember: (groupId: string, member: string) => void;
  addLoan: (data: Omit<Loan, "id" | "payments">) => Promise<string>;
  updateLoan: (
    id: string,
    data: Partial<Omit<Loan, "payments" | "id">>,
  ) => Promise<void>;
  deleteLoan: (id: string) => void;
  recordLoanPayment: (id: string, payment: Omit<LoanPayment, "id">) => void;
  deleteLoanPayment: (id: string, paymentId: string) => void;
  reminderError: string | null;
  captureNotice: PaymentReceipt | null;
  dismissCaptureNotice: () => void;
  setBudget: (budget: Budget) => void;
  deleteBudget: (id: string) => void;
  replaceGroups: (groups: BillGroup[]) => void;
  replaceGroup: (group: BillGroup) => void;
  restoreData: (data: unknown) => Promise<void>;
  exportData: () => Promise<AppState>;

  resetData: () => Promise<void>;
  retrySave: () => void;
  storageError: string | null;
  changeTransactionDirection: (
    id: string,
    from: "expense" | "income",
    to: "expense" | "income",
    details: {
      amount: number;
      date: string;
      notes?: string;
      name?: string;
      category?: string;
    },
  ) => Promise<void>;
  addIncome: (data: Omit<IncomeEntry, "id">) => void;
  updateIncome: (id: string, data: Partial<IncomeEntry>) => void;
  deleteIncome: (id: string) => void;
  resolvePayment: (
    id: string,
    kind: "expense" | "income" | "transfer" | "ignore",
    amount?: number,
    details?: { name?: string; category?: string; notes?: string },
  ) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  addExpense: (expense: Omit<Expense, "id">) => Promise<string>;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addAutoExpense: (ae: Omit<AutoExpense, "id">) => void;
  updateAutoExpense: (id: string, ae: Partial<AutoExpense>) => void;
  deleteAutoExpense: (id: string) => void;
  addDebt: (debt: Omit<DebtEntry, "id">) => void;
  updateDebt: (id: string, debt: Partial<DebtEntry>) => void;
  deleteDebt: (id: string) => void;
  addStock: (stock: Omit<StockEntry, "id">) => void;
  updateStock: (id: string, stock: Partial<StockEntry>) => void;
  deleteStock: (id: string) => void;
  addCrypto: (crypto: Omit<CryptoEntry, "id">) => void;
  updateCrypto: (id: string, crypto: Partial<CryptoEntry>) => void;
  deleteCrypto: (id: string) => void;
  addGoldSilver: (gs: Omit<GoldSilverEntry, "id">) => void;
  updateGoldSilver: (id: string, gs: Partial<GoldSilverEntry>) => void;
  deleteGoldSilver: (id: string) => void;
  addGoal: (goal: Omit<SavingsGoal, "id">) => void;
  updateGoal: (id: string, goal: Partial<SavingsGoal>) => void;
  deleteGoal: (id: string) => void;
  addBillGroup: (
    group: Omit<BillGroup, "id" | "createdAt" | "expenses">,
  ) => void;
  deleteBillGroup: (id: string) => void;
  addBillExpense: (groupId: string, expense: Omit<BillExpense, "id">) => void;
  deleteBillExpense: (groupId: string, expenseId: string) => void;
  totalIncome: number;
  totalExpenses: number;
  totalAutoExpenses: number;
  totalSavings: number;
  totalInvestments: number;
  totalDebt: number;
  netWorth: number;
  balance: number;
  availableBalance: number;
  goalSavings: number;
  monthlySurplus: number;
  addGoalSavings: (id: string, amount: number) => void;
}

const defaultProfile: UserProfile = {
  name: "",
  username: "",
  profilePhoto: undefined,
  monthlySalary: 0,
  yearlySalary: 0,
  otherIncome: 0,
  currentSavings: 0,
  onboardingComplete: false,
};

const defaultState: AppState = {
  remindersEnabled: false,
  loans: [],
  groupMemberships: {},
  budgets: [],
  incomes: [],
  paymentReviews: [],
  capturedIds: [],
  profile: defaultProfile,
  expenses: [],
  autoExpenses: [],
  debts: [],
  stocks: [],
  cryptos: [],
  goldSilver: [],
  goals: [],
  billGroups: [],
};

const AppContext = createContext<AppContextType | undefined>(undefined);

function genId() {
  return Crypto.randomUUID();
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [loaded, setLoaded] = useState(false);
  const [today, setToday] = useState(localDate());
  const [captureNotice, setCaptureNotice] = useState<PaymentReceipt | null>(
    null,
  );
  const dismissCaptureNotice = useCallback(() => setCaptureNotice(null), []);
  useEffect(() => {
    const refresh = () => setToday(localDate());
    const timer = setInterval(refresh, 60000);
    const lifecycle = Lifecycle.addEventListener("change", (status) => {
      if (status === "active") refresh();
    });
    return () => {
      clearInterval(timer);
      lifecycle.remove();
    };
  }, []);
  const stateRef = useRef<AppState>(defaultState);
  const restoring = useRef(false);

  const [reminderError, setReminderError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const saving = useRef<Promise<void>>(Promise.resolve());
  const importBusy = useRef(false);
  const captureEpoch = useRef(0);
  const resetting = useRef(false);
  useEffect(() => {
    let active = true;
    loadLedger({ ...defaultState, deviceId: genId() })
      .then((data) => {
        if (!active) return;
        const deviceId = data.deviceId || genId();
        const next = {
          ...data,
          groupMemberships: { ...data.groupMemberships },
          deviceId,
          billGroups: data.billGroups.map((g) => ({
            ...g,
            organizerId: g.organizerId || deviceId,
            memberIds:
              g.memberIds ||
              Object.fromEntries(g.members.map((m) => [m, genId()])),
            revision: g.revision || 0,
          })),
        };
        for (const group of next.billGroups) {
          if (!next.groupMemberships[group.id]) {
            const member = localGroupMember(group, {}, next.profile);
            if (member) next.groupMemberships[group.id] = member;
          }
        }
        stateRef.current = next;
        setState(next);
        setLoaded(true);
        persist(next);
      })
      .catch(() => {
        if (active)
          setStorageError(
            "Could not load saved data. Existing data has not been overwritten. Reopen the app or use a verified backup; do not uninstall it.",
          );
      });
    return () => {
      active = false;
    };
  }, []);

  // Queue immediately with each mutation, so restore/export cannot race a pending React effect.
  const persist = useCallback((next: AppState) => {
    const epoch = captureEpoch.current;
    saving.current = saving.current
      .catch(() => {})
      .then(async () => {
        await saveLedger(next);
        if (
          notificationBridge &&
          next.capturedIds.length &&
          epoch === captureEpoch.current
        ) {
          await notificationBridge.acknowledge(next.capturedIds);
        }
        setStorageError(null);
      });
    void saving.current.catch(() =>
      setStorageError(
        "Changes could not be saved or capture acknowledgement failed. Keep the app open and use Retry saving. Captured payments remain queued for retry.",
      ),
    );
  }, []);

  const update = useCallback(
    (updater: (s: AppState) => AppState) => {
      if (restoring.current || resetting.current) return false;
      try {
        const previous = stateRef.current,
          proposed = updater(previous);
        if (proposed === previous) return false;
        const next = ledgerSchema.parse(proposed);
        stateRef.current = next;
        setState(next);
        persist(next);
        return true;
      } catch {
        setStorageError(
          "This change contains invalid data and was not applied. Check amounts, dates and group members.",
        );
        return false;
      }
    },
    [persist],
  );
  const setGroupMember = useCallback(
    (groupId: string, member: string) =>
      update((s) => {
        if (
          !s.billGroups.some(
            (g) => g.id === groupId && g.members.includes(member),
          )
        )
          return s;
        return {
          ...s,
          groupMemberships: { ...s.groupMemberships, [groupId]: member },
        };
      }),
    [update],
  );
  const addLoan = useCallback(
    async (data: Omit<Loan, "id" | "payments">) => {
      const loan = loanSchema.parse({ ...data, id: genId(), payments: [] });
      if (!update((s) => ({ ...s, loans: [loan, ...s.loans] })))
        throw Error(
          "Loan could not be added. Keep the form open and try again.",
        );
      await saving.current;
      return loan.id;
    },
    [update],
  );
  const updateLoan = useCallback(
    async (id: string, data: Partial<Omit<Loan, "id" | "payments">>) => {
      if (
        !update((s) => {
          const original = s.loans.find((l) => l.id === id);
          if (!original) return s;
          const changed = loanSchema.parse({ ...original, ...data });
          return {
            ...s,
            loans: s.loans.map((l) => (l.id === id ? changed : l)),
          };
        })
      )
        throw Error(
          "Loan could not be updated. Check the details and try again.",
        );
      await saving.current;
    },
    [update],
  );
  const deleteLoan = useCallback(
    (id: string) =>
      update((s) => ({ ...s, loans: s.loans.filter((l) => l.id !== id) })),
    [update],
  );
  const recordLoanPayment = useCallback(
    (id: string, payment: Omit<LoanPayment, "id">) =>
      update((s) => {
        const loan = s.loans.find((l) => l.id === id);
        if (!loan || payment.date > localDate()) return s;
        if (payment.activityId) {
          const transaction = (
            loan.kind === "borrowed" ? s.expenses : s.incomes
          ).find((e) => e.id === payment.activityId);
          if (
            !transaction ||
            transaction.amount !== payment.amount ||
            transaction.date !== payment.date ||
            s.loans.some((l) =>
              l.payments.some((p) => p.activityId === payment.activityId),
            )
          )
            return s;
        }
        return {
          ...s,
          loans: s.loans.map((l) =>
            l.id === id
              ? loanSchema.parse({
                  ...l,
                  payments: [...l.payments, { ...payment, id: genId() }],
                })
              : l,
          ),
        };
      }),
    [update],
  );
  const deleteLoanPayment = useCallback(
    (id: string, paymentId: string) =>
      update((s) => ({
        ...s,
        loans: s.loans.map((l) =>
          l.id === id
            ? { ...l, payments: l.payments.filter((p) => p.id !== paymentId) }
            : l,
        ),
      })),
    [update],
  );
  const setBudget = useCallback(
    (budget: Budget) =>
      update((s) => ({
        ...s,
        budgets: [
          ...s.budgets.filter(
            (b) =>
              !(b.month === budget.month && b.category === budget.category),
          ),
          budget,
        ],
      })),
    [update],
  );
  const deleteBudget = useCallback(
    (id: string) =>
      update((s) => ({ ...s, budgets: s.budgets.filter((b) => b.id !== id) })),
    [update],
  );
  const replaceGroups = useCallback(
    (billGroups: BillGroup[]) => update((s) => ({ ...s, billGroups })),
    [update],
  );
  const replaceGroup = useCallback(
    (group: BillGroup) =>
      update((s) => ({
        ...s,
        billGroups: s.billGroups.map((g) => (g.id === group.id ? group : g)),
      })),
    [update],
  );
  const exportData = useCallback(async () => {
    await saving.current;
    return ledgerSchema.parse(stateRef.current);
  }, []);
  const restoreData = useCallback(async (data: unknown) => {
    const next = ledgerSchema.parse(data);
    restoring.current = true;
    setCaptureNotice(null);
    captureEpoch.current++;
    try {
      await saving.current;
      // An encrypted full backup restores its organizer ownership; shared copies stay shared.
      const deviceId = stateRef.current.deviceId || genId();
      const restored = {
        ...next,
        deviceId,
        billGroups: next.billGroups.map((g) =>
          g.organizerId === next.deviceId && !g.readOnly
            ? { ...g, organizerId: deviceId, readOnly: false }
            : g,
        ),
      };
      await saveLedger(restored, true);
      stateRef.current = restored;
      setState(restored);
      setStorageError(null);
    } finally {
      restoring.current = false;
    }
  }, []);

  useEffect(() => {
    if (!loaded || !notificationBridge) return;
    let active = true;
    const sync = async () => {
      if (importBusy.current || resetting.current || restoring.current) return;
      const epoch = captureEpoch.current;
      importBusy.current = true;
      try {
        const { events, rejected } = inspectPaymentBatch(
          await notificationBridge!.pending(),
        );
        if (!active || epoch !== captureEpoch.current) return;
        if (!events.length) {
          if (rejected)
            setStorageError(
              "Some captured events are invalid. They remain on the phone; valid new events can still be imported. Check your statement.",
            );
          return;
        }
        const previous = stateRef.current;
        const next = applyCapturedPayments(previous, events);
        if (next !== previous) {
          update(() => next);
          await saving.current;
          if (epoch === captureEpoch.current) {
            await notificationBridge!.markImported?.();
            const receipt = selectNewPaymentReceipt(
              previous.capturedIds,
              stateRef.current.expenses,
              stateRef.current.incomes,
            );
            if (receipt && active) setCaptureNotice(receipt);
          }
        } else if (events.some((e) => previous.capturedIds.includes(e.id))) {
          // Retry an interrupted native acknowledgement without adding ledger entries again.
          await saving.current;
          await notificationBridge!.acknowledge(previous.capturedIds);
        }
        if (rejected)
          setStorageError(
            "Some captured events are invalid and remain queued. Valid events were retained. Check your statement.",
          );
      } catch {
        if (active)
          setStorageError(
            "Payment sync failed. Captured payments remain on the device for retry.",
          );
      } finally {
        importBusy.current = false;
      }
    };
    void sync();
    const timer = setInterval(() => {
      if (Lifecycle.currentState === "active") void sync();
    }, 5000);
    const subscription = Lifecycle.addEventListener("change", (status) => {
      if (status === "active") void sync();
    });
    return () => {
      active = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [loaded, update]);

  useEffect(() => {
    if (!loaded || !notificationBridge) return;
    let active = true;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          await saving.current;
          if (!active) return;
          const saved = stateRef.current;
          await notificationBridge!.syncReminders(
            saved.remindersEnabled,
            JSON.stringify(paymentReminders(saved)),
          );
          if (active) setReminderError(null);
        } catch {
          if (active)
            setReminderError(
              "Payment reminders could not be scheduled. Reopen the app and check notification settings.",
            );
        }
      })();
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [loaded, state.loans, state.debts, state.remindersEnabled]);

  const resetData = useCallback(async () => {
    captureEpoch.current++;
    setCaptureNotice(null);
    resetting.current = true;
    try {
      await saving.current.catch(() => {});
      await notificationBridge?.clear();
      const next = {
        ...defaultState,
        deviceId: stateRef.current.deviceId,
        profile: { ...defaultProfile },
      };
      await clearLedger(next);
      stateRef.current = next;
      setState(next);
      setStorageError(null);
    } catch {
      const message =
        "Reset could not finish. Check device storage and notification access, then try again.";
      setStorageError(message);
      throw Error(message);
    } finally {
      resetting.current = false;
    }
  }, []);
  const retrySave = useCallback(() => update((s) => ({ ...s })), [update]);
  const announceManual = useCallback(
    (id: string, kind: "income" | "expense") => {
      const epoch = captureEpoch.current;
      void saving.current
        .then(() => {
          if (epoch !== captureEpoch.current) return;
          const entry = (
            kind === "income"
              ? stateRef.current.incomes
              : stateRef.current.expenses
          ).find((e) => e.id === id);
          if (entry) setCaptureNotice({ ...entry, kind, manual: true });
        })
        .catch(() => {});
    },
    [],
  );
  const changeTransactionDirection = useCallback(
    async (
      id: string,
      from: "expense" | "income",
      to: "expense" | "income",
      details: {
        amount: number;
        date: string;
        notes?: string;
        name?: string;
        category?: string;
      },
    ) => {
      const next = correctTransactionDirection(
        stateRef.current,
        id,
        from,
        to,
        details,
      );
      if (!update(() => next))
        throw Error("Could not correct this entry. Check the details.");
      await saving.current;
    },
    [update],
  );
  const addIncome = useCallback(
    (data: Omit<IncomeEntry, "id">) => {
      if (!Number.isFinite(data.amount) || data.amount <= 0) return;
      const id = genId();
      update((s) => ({ ...s, incomes: [{ ...data, id }, ...s.incomes] }));
      announceManual(id, "income");
    },
    [update, announceManual],
  );
  const updateIncome = useCallback(
    (id: string, data: Partial<IncomeEntry>) =>
      update((s) => ({
        ...s,
        incomes: s.incomes.map((e) =>
          e.id === id ? { ...e, ...data, id: e.id } : e,
        ),
      })),
    [update],
  );
  const deleteIncome = useCallback(
    (id: string) =>
      update((s) => ({ ...s, incomes: s.incomes.filter((e) => e.id !== id) })),
    [update],
  );
  const resolvePayment = useCallback(
    (
      id: string,
      kind: "expense" | "income" | "transfer" | "ignore",
      amount?: number,
      details?: { name?: string; category?: string; notes?: string },
    ) => update((s) => resolveCapturedPayment(s, id, kind, amount, details)),
    [update],
  );

  const updateProfile = useCallback(
    (profile: Partial<UserProfile>) =>
      update((s) => ({ ...s, profile: { ...s.profile, ...profile } })),
    [update],
  );

  const addExpense = useCallback(
    async (expense: Omit<Expense, "id">) => {
      const id = genId();
      if (
        !update((s) => ({
          ...s,
          expenses: [{ ...expense, id }, ...s.expenses],
        }))
      )
        throw Error("Expense was not added. Check its amount and date.");
      await saving.current;
      announceManual(id, "expense");
      return id;
    },
    [update, announceManual],
  );
  const updateExpense = useCallback(
    (id: string, expense: Partial<Expense>) =>
      update((s) => ({
        ...s,
        expenses: s.expenses.map((e) =>
          e.id === id ? { ...e, ...expense } : e,
        ),
      })),
    [update],
  );
  const deleteExpense = useCallback(
    (id: string) =>
      update((s) => ({
        ...s,
        expenses: s.expenses.filter((e) => e.id !== id),
      })),
    [update],
  );

  const addAutoExpense = useCallback(
    (ae: Omit<AutoExpense, "id">) =>
      update((s) => ({
        ...s,
        autoExpenses: [...s.autoExpenses, { ...ae, id: genId() }],
      })),
    [update],
  );
  const updateAutoExpense = useCallback(
    (id: string, ae: Partial<AutoExpense>) =>
      update((s) => ({
        ...s,
        autoExpenses: s.autoExpenses.map((a) =>
          a.id === id ? { ...a, ...ae } : a,
        ),
      })),
    [update],
  );
  const deleteAutoExpense = useCallback(
    (id: string) =>
      update((s) => ({
        ...s,
        autoExpenses: s.autoExpenses.filter((a) => a.id !== id),
      })),
    [update],
  );

  const addDebt = useCallback(
    (debt: Omit<DebtEntry, "id">) =>
      update((s) => ({ ...s, debts: [{ ...debt, id: genId() }, ...s.debts] })),
    [update],
  );
  const updateDebt = useCallback(
    (id: string, debt: Partial<DebtEntry>) =>
      update((s) => ({
        ...s,
        debts: s.debts.map((d) => (d.id === id ? { ...d, ...debt } : d)),
      })),
    [update],
  );
  const deleteDebt = useCallback(
    (id: string) =>
      update((s) => ({ ...s, debts: s.debts.filter((d) => d.id !== id) })),
    [update],
  );

  const addStock = useCallback(
    (stock: Omit<StockEntry, "id">) =>
      update((s) => ({
        ...s,
        stocks: [{ ...stock, id: genId() }, ...s.stocks],
      })),
    [update],
  );
  const updateStock = useCallback(
    (id: string, stock: Partial<StockEntry>) =>
      update((s) => ({
        ...s,
        stocks: s.stocks.map((st) => (st.id === id ? { ...st, ...stock } : st)),
      })),
    [update],
  );
  const deleteStock = useCallback(
    (id: string) =>
      update((s) => ({ ...s, stocks: s.stocks.filter((st) => st.id !== id) })),
    [update],
  );

  const addCrypto = useCallback(
    (crypto: Omit<CryptoEntry, "id">) =>
      update((s) => ({
        ...s,
        cryptos: [{ ...crypto, id: genId() }, ...s.cryptos],
      })),
    [update],
  );
  const updateCrypto = useCallback(
    (id: string, crypto: Partial<CryptoEntry>) =>
      update((s) => ({
        ...s,
        cryptos: s.cryptos.map((c) => (c.id === id ? { ...c, ...crypto } : c)),
      })),
    [update],
  );
  const deleteCrypto = useCallback(
    (id: string) =>
      update((s) => ({ ...s, cryptos: s.cryptos.filter((c) => c.id !== id) })),
    [update],
  );

  const addGoldSilver = useCallback(
    (gs: Omit<GoldSilverEntry, "id">) =>
      update((s) => ({
        ...s,
        goldSilver: [{ ...gs, id: genId() }, ...s.goldSilver],
      })),
    [update],
  );
  const updateGoldSilver = useCallback(
    (id: string, gs: Partial<GoldSilverEntry>) =>
      update((s) => ({
        ...s,
        goldSilver: s.goldSilver.map((g) =>
          g.id === id ? { ...g, ...gs } : g,
        ),
      })),
    [update],
  );
  const deleteGoldSilver = useCallback(
    (id: string) =>
      update((s) => ({
        ...s,
        goldSilver: s.goldSilver.filter((g) => g.id !== id),
      })),
    [update],
  );

  const addGoalSavings = useCallback(
    (id: string, amount: number) =>
      update((previous) => contributeToGoal(previous, id, amount)),
    [update],
  );

  const addGoal = useCallback(
    (goal: Omit<SavingsGoal, "id">) =>
      update((s) => ({ ...s, goals: [{ ...goal, id: genId() }, ...s.goals] })),
    [update],
  );
  const updateGoal = useCallback(
    (id: string, goal: Partial<SavingsGoal>) =>
      update((s) => ({
        ...s,
        goals: s.goals.map((g) => (g.id === id ? { ...g, ...goal } : g)),
      })),
    [update],
  );
  const deleteGoal = useCallback(
    (id: string) =>
      update((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) })),
    [update],
  );

  const addBillGroup = useCallback(
    (group: Omit<BillGroup, "id" | "createdAt" | "expenses">) =>
      update((s) => {
        const id = genId();
        const member = localGroupMember(
          { ...group, id } as BillGroup,
          {},
          s.profile,
        );
        return {
          ...s,
          groupMemberships: member
            ? { ...s.groupMemberships, [id]: member }
            : s.groupMemberships,
          billGroups: [
            {
              ...group,
              id,
              createdAt: new Date().toISOString(),
              expenses: [],
              organizerId: s.deviceId,
              memberIds: Object.fromEntries(
                group.members.map((m) => [m, genId()]),
              ),
              revision: 0,
              repayments: [],
              proposals: [],
              handledProposalIds: [],
            },
            ...s.billGroups,
          ],
        };
      }),
    [update],
  );
  const deleteBillGroup = useCallback(
    (id: string) =>
      update((s) => ({
        ...s,
        billGroups: s.billGroups.filter((g) => g.id !== id),
      })),
    [update],
  );
  const addBillExpense = useCallback(
    (groupId: string, expense: Omit<BillExpense, "id">) =>
      update((s) => ({
        ...s,
        billGroups: s.billGroups.map((g) =>
          g.id === groupId && !g.readOnly
            ? {
                ...g,
                revision: (g.revision || 0) + 1,
                expenses: [...g.expenses, { ...expense, id: genId() }],
              }
            : g,
        ),
      })),
    [update],
  );
  const deleteBillExpense = useCallback(
    (groupId: string, expenseId: string) =>
      update((s) => ({
        ...s,
        billGroups: s.billGroups.map((g) =>
          g.id === groupId && !g.readOnly
            ? {
                ...g,
                revision: (g.revision || 0) + 1,
                expenses: g.expenses.filter((e) => e.id !== expenseId),
              }
            : g,
        ),
      })),
    [update],
  );

  // Derived values
  const currentMonth = today.slice(0, 7);
  // Actual recorded income replaces the planned monthly salary; never add both and double-count salary.
  const summary = financeSummary(state, currentMonth);
  const totalIncome = summary.income;
  const totalExpenses = summary.expenses;
  const totalAutoExpenses = state.autoExpenses
    .filter((a) => a.isActive)
    .reduce((s, a) => s + a.amount, 0);

  const stockValue = state.stocks.reduce(
    (s, st) => s + st.quantity * st.currentPrice,
    0,
  );
  const cryptoValue = state.cryptos.reduce(
    (s, c) => s + c.quantity * c.currentPrice,
    0,
  );
  const goldSilverValue = state.goldSilver.reduce(
    (s, g) => s + g.quantity * g.currentPrice,
    0,
  );
  const totalInvestments = stockValue + cryptoValue + goldSilverValue;

  const obligations = linkedObligations(state);
  const totalDebt =
    obligations
      .filter((d) => d.type === "debit" && d.status === "Pending")
      .reduce((s, d) => s + Math.round(d.amount * 100), 0) / 100;
  const totalCredit =
    obligations
      .filter((d) => d.type === "credit" && d.status === "Pending")
      .reduce((s, d) => s + Math.round(d.amount * 100), 0) / 100;

  const totalSavings = state.profile.currentSavings;

  // Goal pots reserve existing money; they never create additional wealth.
  const netWorth = summary.balance + totalInvestments + totalCredit - totalDebt;

  if (!loaded)
    return storageError ? (
      <StorageRecovery
        message={storageError}
        onRestore={async (data) => {
          await restoreData(data);
          setLoaded(true);
        }}
      />
    ) : (
      <View
        style={{
          flex: 1,
          backgroundColor: "#EFEDE3",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Image
          source={require("../assets/images/logo.png")}
          style={{ width: 96, height: 96 }}
          accessibilityLabel="Pro Financier"
        />
      </View>
    );

  return (
    <AppContext.Provider
      value={{
        ...state,
        obligations,
        totalCredit,
        monthlyLoanPayments: summary.loanReserve,
        setRemindersEnabled: (value: boolean) =>
          update((s) => ({ ...s, remindersEnabled: value })),
        setGroupMember,
        addLoan,
        updateLoan,
        deleteLoan,
        recordLoanPayment,
        deleteLoanPayment,
        reminderError,
        captureNotice,
        dismissCaptureNotice,
        setBudget,
        deleteBudget,
        replaceGroups,
        replaceGroup,
        restoreData,
        exportData,
        resetData,
        retrySave,
        storageError,
        changeTransactionDirection,
        addIncome,
        updateIncome,
        deleteIncome,
        resolvePayment,
        updateProfile,
        addExpense,
        updateExpense,
        deleteExpense,
        addAutoExpense,
        updateAutoExpense,
        deleteAutoExpense,
        addDebt,
        updateDebt,
        deleteDebt,
        addStock,
        updateStock,
        deleteStock,
        addCrypto,
        updateCrypto,
        deleteCrypto,
        addGoldSilver,
        updateGoldSilver,
        deleteGoldSilver,
        addGoal,
        updateGoal,
        deleteGoal,
        addBillGroup,
        deleteBillGroup,
        addBillExpense,
        deleteBillExpense,
        totalIncome,
        totalExpenses,
        totalAutoExpenses,
        totalSavings,
        totalInvestments,
        totalDebt,
        netWorth,
        balance: summary.balance,
        availableBalance: summary.availableBalance,
        goalSavings: summary.goalSavings,
        monthlySurplus: summary.monthlySurplus,
        addGoalSavings,
      }}
    >
      <View style={{ flex: 1 }}>
        {!!storageError && (
          <View
            style={{ padding: 16, paddingTop: 32, backgroundColor: "#fff3cd" }}
          >
            <Text style={{ color: "#6b4100" }}>{storageError}</Text>
            <Text
              accessibilityRole="button"
              onPress={retrySave}
              style={{
                color: "#0d7478",
                fontWeight: "700",
                paddingVertical: 8,
              }}
            >
              Retry saving
            </Text>
          </View>
        )}
        {children}
      </View>
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
