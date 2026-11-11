import AsyncStorage from "@react-native-async-storage/async-storage";
import { openDatabaseAsync } from "expo-sqlite";
import type { SQLiteDatabase } from "expo-sqlite";
import { decodeLedger, ledgerSchema } from "./ledgerSchema";
import type { Ledger } from "./ledgerSchema";
import {
  LEDGER_SQL,
  writeSQLLedger,
  readSQLLedger,
  eraseSQLLedger,
} from "./sqlLedger";
const LEGACY = "profinancier_data_v3";
let database: Promise<SQLiteDatabase> | undefined;
async function db() {
  if (!database)
    database = (async () => {
      const d = await openDatabaseAsync("profinancier-ledger.db");
      const version = await d.getFirstAsync<{ user_version: number }>(
        "PRAGMA user_version",
      );
      if ((version?.user_version || 0) > 1)
        throw Error("This ledger needs a newer app version.");
      await d.execAsync(LEDGER_SQL);
      return d;
    })();
  return database;
}
export async function saveLedger(value: Ledger, recovery = false) {
  await writeSQLLedger(await db(), value, recovery);
}
export async function loadLedger(defaults: Ledger): Promise<Ledger> {
  const current = await readSQLLedger(await db());
  if (current) return current;
  const raw = await AsyncStorage.getItem(LEGACY),
    legacy = raw ? JSON.parse(raw) : {};
  const next = ledgerSchema.parse({
    ...defaults,
    ...legacy,
    profile: { ...defaults.profile, ...legacy.profile },
  });
  await saveLedger(next); // Original legacy entry deliberately retained for recovery.
  return next;
}
export async function recoverLedger(): Promise<Ledger> {
  const value = await readSQLLedger(await db(), true);
  if (!value)
    throw Error(
      "No recovery copy is available. Existing records have not been changed.",
    );
  return value;
}

export async function clearLedger(empty: Ledger) {
  // Explicit user reset also removes the retained pre-migration copy.
  await AsyncStorage.removeItem(LEGACY);
  await eraseSQLLedger(await db(), empty);
}
