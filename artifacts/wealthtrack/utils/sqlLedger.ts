import { decodeLedger, encodeLedger } from "./ledgerSchema";
import type { Ledger } from "./ledgerSchema";
export const LEDGER_SQL =
  "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS ledger (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS processed_capture (id TEXT PRIMARY KEY); CREATE TABLE IF NOT EXISTS recovery (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL); PRAGMA user_version=1;";
export interface LedgerTransaction {
  runAsync(sql: string, ...params: string[]): Promise<unknown>;
}
export interface LedgerDatabase {
  withExclusiveTransactionAsync(
    fn: (tx: LedgerTransaction) => Promise<void>,
  ): Promise<void>;
  getFirstAsync<T>(sql: string): Promise<T | null>;
}
export async function writeSQLLedger(
  db: LedgerDatabase,
  value: Ledger,
  recovery = false,
) {
  const payload = encodeLedger(value);
  await db.withExclusiveTransactionAsync(async (tx) => {
    if (recovery)
      await tx.runAsync(
        "INSERT OR REPLACE INTO recovery SELECT 1,payload FROM ledger WHERE id=1",
      );
    await tx.runAsync(
      "INSERT OR REPLACE INTO ledger(id,payload) VALUES(1,?)",
      payload,
    );
    // A restore/reset replaces this ledger's deduplication history atomically.
    if (recovery || !value.capturedIds.length)
      await tx.runAsync("DELETE FROM processed_capture");
    const ids = [...new Set(value.capturedIds)];
    // Stay below older SQLite's bind-parameter limit and avoid one bridge call per ID.
    for (let offset = 0; offset < ids.length; offset += 500) {
      const batch = ids.slice(offset, offset + 500);
      await tx.runAsync(
        "INSERT OR IGNORE INTO processed_capture(id) VALUES " +
          batch.map(() => "(?)").join(","),
        ...batch,
      );
    }
  });
}
export async function readSQLLedger(db: LedgerDatabase, recovery = false) {
  const row = await db.getFirstAsync<{ payload: string }>(
    `SELECT payload FROM ${recovery ? "recovery" : "ledger"} WHERE id=1`,
  );
  return row ? decodeLedger(row.payload) : null;
}
