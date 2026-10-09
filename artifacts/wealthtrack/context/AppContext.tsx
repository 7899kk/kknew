import { financeSummary, contributeToGoal } from '@/utils/financeSummary';
import type { PaymentEvent } from '@/utils/paymentModels';
import { applyCapturedPayments, resolveCapturedPayment } from "@/utils/capturedPayments";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { AppState as Lifecycle, Text, View } from "react-native";
import { CapturedPayment, notificationBridge, sourceNames } from "@/utils/notificationBridge";

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
  category: ExpenseCategory;
  amount: number;
  paymentType: PaymentType;
  notes?: string;
  merchant?: string;
  upiRef?: string;
  captureId?: string;
  source?: string;
  needsReason?: boolean;
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
  emoji?: string;
  category?: "Bike" | "Car" | "Flat" | "Emergency" | "Custom";
}

export interface BillGroup {
  id: string;
  name: string;
  members: string[];
  expenses: BillExpense[];
  createdAt: string;
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

export interface IncomeEntry { id: string; amount: number; date: string; notes?: string; name?: string; category?: string; source?: string; captureId?: string; }
export interface PaymentReview extends CapturedPayment { status: "review" | "transfer"; }

interface AppState {
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
  resetData: () => void;
  retrySave: () => void;
  storageError: string | null;
  addIncome: (data: Omit<IncomeEntry, "id">) => void;
  updateIncome: (id: string, data: Partial<IncomeEntry>) => void;
  deleteIncome: (id: string) => void;
  resolvePayment: (id: string, kind: "expense" | "income" | "transfer" | "ignore", amount?: number, details?: { name?:string; category?:string; notes?:string }) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  addExpense: (expense: Omit<Expense, "id">) => void;
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
  addBillGroup: (group: Omit<BillGroup, "id" | "createdAt" | "expenses">) => void;
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
  addGoalSavings: (id:string,amount:number) => void;
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
  incomes: [], paymentReviews: [], capturedIds: [],
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

const STORAGE_KEY = "profinancier_data_v3";

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [loaded, setLoaded] = useState(false);

  const [storageError, setStorageError] = useState<string | null>(null);
  const saving = useRef<Promise<void>>(Promise.resolve());
  const importBusy = useRef(false);
  const captureEpoch = useRef(0);
  const resetting = useRef(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!active) return;
      const parsed = raw ? JSON.parse(raw) : {};
      const next = { ...defaultState, ...parsed, profile: { ...defaultProfile, ...parsed.profile } };
      for (const key of Object.keys(defaultState)) {
        if (key !== "profile" && !Array.isArray(next[key])) next[key] = [];
      }
      setState(next);
      setLoaded(true);
    }).catch(() => { if (active) setStorageError("Could not load saved data. Close and reopen the app. Existing data has not been overwritten."); });
    return () => { active = false; };
  }, []);

  // Save after state updates, in order. A native queue item is acknowledged only after durable storage succeeds.
  useEffect(() => {
    if (!loaded) return;
    saving.current = saving.current.catch(() => {}).then(async () => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (notificationBridge && state.capturedIds.length) await notificationBridge.acknowledge(state.capturedIds);
      setStorageError(null);
    }).catch(() => { setStorageError("Some changes could not be saved. Keep the app open and retry by making a change. Payment capture has not been acknowledged."); });
  }, [state, loaded]);

  const update = useCallback((updater: (s: AppState) => AppState) => setState(updater), []);

  useEffect(() => {
    if (!loaded || !notificationBridge) return;
    let active = true;
    const sync = async () => {
      if (importBusy.current || resetting.current) return;
      const epoch = captureEpoch.current;
      importBusy.current = true;
      try {
        const events: PaymentEvent[] = JSON.parse(await notificationBridge!.pending());
        if (!active || epoch !== captureEpoch.current || !events.length) return;
        update((previous) => {
          if (epoch !== captureEpoch.current) return previous;
          return applyCapturedPayments(previous, events);
        });
      } catch { if (active) setStorageError("Payment sync failed. Captured payments remain on the device for retry."); }
      finally { importBusy.current = false; }
    };
    void sync();
    const timer = setInterval(() => { if (Lifecycle.currentState === "active") void sync(); }, 5000);
    const subscription = Lifecycle.addEventListener("change", status => { if (status === "active") void sync(); });
    return () => { active = false; clearInterval(timer); subscription.remove(); };
  }, [loaded, update]);

  const resetData = useCallback(() => {
    // Reset requested from the confirmation screen; archived investment data is also cleared.
    captureEpoch.current++;
    resetting.current = true;
    const clearCapture = notificationBridge?.clear() ?? Promise.resolve();
    clearCapture.catch(() => setStorageError("Could not disable payment capture. Disable it in Android settings.")).finally(() => { resetting.current = false; });
    update(() => ({ ...defaultState, profile: { ...defaultProfile } }));
  }, [update]);
  const retrySave = useCallback(() => update(s => ({...s})), [update]);
  const addIncome = useCallback((data: Omit<IncomeEntry,"id">) => {
    if (!Number.isFinite(data.amount) || data.amount <= 0) return;
    update(s => ({ ...s, incomes:[{...data,id:genId()},...s.incomes] }));
  }, [update]);
  const updateIncome = useCallback((id:string,data:Partial<IncomeEntry>) => update(s => ({...s,incomes:s.incomes.map(e=>e.id===id ? {...e,...data,id:e.id} : e)})),[update]);
  const deleteIncome = useCallback((id:string) => update(s=>({...s,incomes:s.incomes.filter(e=>e.id!==id)})),[update]);
  const resolvePayment = useCallback((id:string,kind:"expense"|"income"|"transfer"|"ignore",amount?:number,details?:{name?:string;category?:string;notes?:string}) => update(s => resolveCapturedPayment(s,id,kind,amount,details)),[update]);

  const updateProfile = useCallback(
    (profile: Partial<UserProfile>) =>
      update((s) => ({ ...s, profile: { ...s.profile, ...profile } })),
    [update]
  );

  const addExpense = useCallback(
    (expense: Omit<Expense, "id">) =>
      update((s) => ({ ...s, expenses: [{ ...expense, id: genId() }, ...s.expenses] })),
    [update]
  );
  const updateExpense = useCallback(
    (id: string, expense: Partial<Expense>) =>
      update((s) => ({ ...s, expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...expense } : e)) })),
    [update]
  );
  const deleteExpense = useCallback(
    (id: string) => update((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== id) })),
    [update]
  );

  const addAutoExpense = useCallback(
    (ae: Omit<AutoExpense, "id">) =>
      update((s) => ({ ...s, autoExpenses: [...s.autoExpenses, { ...ae, id: genId() }] })),
    [update]
  );
  const updateAutoExpense = useCallback(
    (id: string, ae: Partial<AutoExpense>) =>
      update((s) => ({ ...s, autoExpenses: s.autoExpenses.map((a) => (a.id === id ? { ...a, ...ae } : a)) })),
    [update]
  );
  const deleteAutoExpense = useCallback(
    (id: string) => update((s) => ({ ...s, autoExpenses: s.autoExpenses.filter((a) => a.id !== id) })),
    [update]
  );

  const addDebt = useCallback(
    (debt: Omit<DebtEntry, "id">) =>
      update((s) => ({ ...s, debts: [{ ...debt, id: genId() }, ...s.debts] })),
    [update]
  );
  const updateDebt = useCallback(
    (id: string, debt: Partial<DebtEntry>) =>
      update((s) => ({ ...s, debts: s.debts.map((d) => (d.id === id ? { ...d, ...debt } : d)) })),
    [update]
  );
  const deleteDebt = useCallback(
    (id: string) => update((s) => ({ ...s, debts: s.debts.filter((d) => d.id !== id) })),
    [update]
  );

  const addStock = useCallback(
    (stock: Omit<StockEntry, "id">) =>
      update((s) => ({ ...s, stocks: [{ ...stock, id: genId() }, ...s.stocks] })),
    [update]
  );
  const updateStock = useCallback(
    (id: string, stock: Partial<StockEntry>) =>
      update((s) => ({ ...s, stocks: s.stocks.map((st) => (st.id === id ? { ...st, ...stock } : st)) })),
    [update]
  );
  const deleteStock = useCallback(
    (id: string) => update((s) => ({ ...s, stocks: s.stocks.filter((st) => st.id !== id) })),
    [update]
  );

  const addCrypto = useCallback(
    (crypto: Omit<CryptoEntry, "id">) =>
      update((s) => ({ ...s, cryptos: [{ ...crypto, id: genId() }, ...s.cryptos] })),
    [update]
  );
  const updateCrypto = useCallback(
    (id: string, crypto: Partial<CryptoEntry>) =>
      update((s) => ({ ...s, cryptos: s.cryptos.map((c) => (c.id === id ? { ...c, ...crypto } : c)) })),
    [update]
  );
  const deleteCrypto = useCallback(
    (id: string) => update((s) => ({ ...s, cryptos: s.cryptos.filter((c) => c.id !== id) })),
    [update]
  );

  const addGoldSilver = useCallback(
    (gs: Omit<GoldSilverEntry, "id">) =>
      update((s) => ({ ...s, goldSilver: [{ ...gs, id: genId() }, ...s.goldSilver] })),
    [update]
  );
  const updateGoldSilver = useCallback(
    (id: string, gs: Partial<GoldSilverEntry>) =>
      update((s) => ({ ...s, goldSilver: s.goldSilver.map((g) => (g.id === id ? { ...g, ...gs } : g)) })),
    [update]
  );
  const deleteGoldSilver = useCallback(
    (id: string) => update((s) => ({ ...s, goldSilver: s.goldSilver.filter((g) => g.id !== id) })),
    [update]
  );

  const addGoalSavings = useCallback((id:string,amount:number)=>update(previous=>contributeToGoal(previous,id,amount)),[update]);

  const addGoal = useCallback(
    (goal: Omit<SavingsGoal, "id">) =>
      update((s) => ({ ...s, goals: [{ ...goal, id: genId() }, ...s.goals] })),
    [update]
  );
  const updateGoal = useCallback(
    (id: string, goal: Partial<SavingsGoal>) =>
      update((s) => ({ ...s, goals: s.goals.map((g) => (g.id === id ? { ...g, ...goal } : g)) })),
    [update]
  );
  const deleteGoal = useCallback(
    (id: string) => update((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) })),
    [update]
  );

  const addBillGroup = useCallback(
    (group: Omit<BillGroup, "id" | "createdAt" | "expenses">) =>
      update((s) => ({
        ...s,
        billGroups: [{ ...group, id: genId(), createdAt: new Date().toISOString(), expenses: [] }, ...s.billGroups],
      })),
    [update]
  );
  const deleteBillGroup = useCallback(
    (id: string) => update((s) => ({ ...s, billGroups: s.billGroups.filter((g) => g.id !== id) })),
    [update]
  );
  const addBillExpense = useCallback(
    (groupId: string, expense: Omit<BillExpense, "id">) =>
      update((s) => ({
        ...s,
        billGroups: s.billGroups.map((g) =>
          g.id === groupId ? { ...g, expenses: [...g.expenses, { ...expense, id: genId() }] } : g
        ),
      })),
    [update]
  );
  const deleteBillExpense = useCallback(
    (groupId: string, expenseId: string) =>
      update((s) => ({
        ...s,
        billGroups: s.billGroups.map((g) =>
          g.id === groupId ? { ...g, expenses: g.expenses.filter((e) => e.id !== expenseId) } : g
        ),
      })),
    [update]
  );

  // Derived values
  const month = new Date();
  const currentMonth = `${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,"0")}`;
  // Actual recorded income replaces the planned monthly salary; never add both and double-count salary.
  const summary=financeSummary(state,currentMonth);
  const totalIncome=summary.income;
  const totalExpenses=summary.expenses;
  const totalAutoExpenses = state.autoExpenses
    .filter((a) => a.isActive)
    .reduce((s, a) => s + a.amount, 0);

  const stockValue = state.stocks.reduce((s, st) => s + st.quantity * st.currentPrice, 0);
  const cryptoValue = state.cryptos.reduce((s, c) => s + c.quantity * c.currentPrice, 0);
  const goldSilverValue = state.goldSilver.reduce((s, g) => s + g.quantity * g.currentPrice, 0);
  const totalInvestments = stockValue + cryptoValue + goldSilverValue;

  const totalDebt = state.debts
    .filter((d) => d.type === "debit" && d.status === "Pending")
    .reduce((s, d) => s + d.amount, 0);

  const totalSavings = state.profile.currentSavings;

  // Goal pots reserve existing money; they never create additional wealth.
  const netWorth = summary.balance + totalInvestments - totalDebt;

  if (!loaded) return <View style={{flex:1,justifyContent:"center",padding:24}}><Text>{storageError || "Loading saved data…"}</Text></View>;

  return (
    <AppContext.Provider
      value={{
        ...state,
        resetData, retrySave, storageError, addIncome, updateIncome, deleteIncome, resolvePayment,
        updateProfile,
        addExpense, updateExpense, deleteExpense,
        addAutoExpense, updateAutoExpense, deleteAutoExpense,
        addDebt, updateDebt, deleteDebt,
        addStock, updateStock, deleteStock,
        addCrypto, updateCrypto, deleteCrypto,
        addGoldSilver, updateGoldSilver, deleteGoldSilver,
        addGoal, updateGoal, deleteGoal,
        addBillGroup, deleteBillGroup, addBillExpense, deleteBillExpense,
        totalIncome,
        totalExpenses,
        totalAutoExpenses,
        totalSavings,
        totalInvestments,
        totalDebt,
        netWorth,
        balance:summary.balance,availableBalance:summary.availableBalance,goalSavings:summary.goalSavings,monthlySurplus:summary.monthlySurplus,addGoalSavings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

