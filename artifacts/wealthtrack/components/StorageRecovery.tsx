import { confirmAction } from "@/utils/dialogs";
import React, { useState } from "react";
import { Alert, ScrollView, Text, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { decryptBackup } from "@/utils/backup";
import { pickFile } from "@/utils/files";
import { recoverLedger } from "@/utils/ledgerStorage";
import type { Ledger } from "@/utils/ledgerSchema";
import { Button } from "./UI";
export function StorageRecovery({
  message,
  onRestore,
}: {
  message: string;
  onRestore: (data: Ledger) => Promise<void>;
}) {
  const c = useColors(),
    insets = useSafeAreaInsets();
  const [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [preview, setPreview] = useState<Ledger | null>(null);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Recovery failed. Existing data is unchanged.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView
      contentContainerStyle={{
        padding: 24,
        paddingTop: insets.top + 32,
        gap: 16,
        flexGrow: 1,
        backgroundColor: c.background,
      }}
    >
      <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 24 }}>
        Your saved data needs attention
      </Text>
      <Text style={{ color: c.foreground }}>{message}</Text>
      <Text style={{ color: c.mutedForeground }}>
        The unreadable ledger has not been replaced. Do not uninstall the app.
        You can restore a verified encrypted backup or a previous recovery copy.
      </Text>
      {!preview ? (
        <>
          <TextInput
            accessibilityLabel="Recovery backup password"
            placeholder="Backup password"
            placeholderTextColor={c.mutedForeground}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            value={password}
            onChangeText={setPassword}
            editable={!busy}
            style={{
              color: c.foreground,
              padding: 12,
              borderWidth: 1,
              borderColor: c.border,
            }}
          />
          <Button
            title="Choose encrypted backup and preview"
            disabled={busy || !password}
            onPress={() =>
              void run(async () => {
                const raw = await pickFile(10 * 1024 * 1024);
                if (raw) {
                  setPreview(await decryptBackup(raw, password));
                  setPassword("");
                }
              })
            }
          />
          <Button
            title="Preview previous recovery copy"
            variant="secondary"
            disabled={busy}
            onPress={() =>
              void run(async () => {
                setPreview(await recoverLedger());
              })
            }
          />
        </>
      ) : (
        <>
          <Text style={{ color: c.foreground }}>
            {preview.expenses.length} expenses, {preview.incomes.length} income
            entries, {preview.billGroups.length} groups. Restoring replaces the
            current ledger and preserves it as a recovery copy.
          </Text>
          <Button
            title="Restore this data"
            disabled={busy}
            onPress={() =>
              confirmAction(
                "Replace unreadable ledger?",
                "A recovery copy is retained before replacement.",
                () => void run(() => onRestore(preview)),
              )
            }
          />
          <Button
            title="Choose another copy"
            disabled={busy}
            variant="ghost"
            onPress={() => setPreview(null)}
          />
        </>
      )}
      {busy && <Text style={{ color: c.foreground }}>Working…</Text>}
      {!!error && <Text style={{ color: c.destructive }}>{error}</Text>}
    </ScrollView>
  );
}
