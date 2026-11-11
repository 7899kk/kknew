// Browser previews use local browser storage; Android uses SQLite transactions.
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  decodeLedger,
  encodeLedger,
  ledgerSchema,
  Ledger,
} from "./ledgerSchema";
const KEY = "profinancier_sqlite_fallback_v1";
export async function saveLedger(value: Ledger, recovery = false) {
  const payload = encodeLedger(value),
    previous = await AsyncStorage.getItem(KEY);
  if (recovery && previous)
    await AsyncStorage.setItem(KEY + "_recovery", previous);
  await AsyncStorage.setItem(KEY, payload);
}
export async function loadLedger(defaults: Ledger) {
  const current = await AsyncStorage.getItem(KEY);
  if (current) return decodeLedger(current);
  const raw = await AsyncStorage.getItem("profinancier_data_v3"),
    legacy = raw ? JSON.parse(raw) : {};
  const next = ledgerSchema.parse({
    ...defaults,
    ...legacy,
    profile: { ...defaults.profile, ...legacy.profile },
  });
  await saveLedger(next);
  return next;
}
export async function recoverLedger() {
  const raw = await AsyncStorage.getItem(KEY + "_recovery");
  if (!raw) throw Error("No recovery copy is available.");
  return decodeLedger(raw);
}

export async function clearLedger(empty: Ledger) {
  await AsyncStorage.multiRemove([
    KEY,
    KEY + "_recovery",
    "profinancier_data_v3",
  ]);
  await saveLedger(empty);
}
