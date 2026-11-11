import { confirmAction, notify } from "@/utils/dialogs";
import React, { useState } from "react";
import { Alert, Modal, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Crypto from "expo-crypto";
import { useApp } from "@/context/AppContext";
import { ledgerSchema, Ledger } from "@/utils/ledgerSchema";
import { decryptBackup, encryptBackup } from "@/utils/backup";
import { pickFile, shareFile } from "@/utils/files";
import { recoverLedger } from "@/utils/ledgerStorage";
import { useColors } from "@/hooks/useColors";
import { Card, Button } from "./UI";
export function LedgerTools() {
  const app = useApp(),
    c = useColors(),
    insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"export" | "restore" | null>(null),
    [password, setPassword] = useState(""),
    [confirmPassword, setConfirmPassword] = useState(""),
    [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Ledger | null>(null),
    [raw, setRaw] = useState(""),
    [error, setError] = useState("");
  const close = () => {
    if (busy) return;
    setMode(null);
    setPassword("");
    setConfirmPassword("");
    setRaw("");
    setPreview(null);
    setError("");
  };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const restore = () =>
    void run(async () => {
      if (!preview) return;
      await app.restoreData(preview);
      setPreview(null);
      setPassword("");
      setRaw("");
      setMode(null);
      notify(
        "Restored",
        "Your previous ledger is available with Recover previous ledger.",
      );
    });
  return (
    <Card>
      <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "700" }}>
        Backup and recovery
      </Text>
      <Text style={{ color: c.mutedForeground, marginVertical: 10 }}>
        Export a password-encrypted file to a location you control. Keep the
        password separately; it cannot be recovered. Login and notification
        permissions are excluded.
      </Text>
      <Button
        title="Export encrypted backup"
        onPress={() => {
          close();
          setMode("export");
        }}
      />
      <Button
        title="Restore encrypted backup"
        variant="secondary"
        onPress={() => {
          close();
          setMode("restore");
        }}
      />
      <Button
        title="Recover previous ledger"
        variant="ghost"
        onPress={() =>
          void run(async () => {
            const data = await recoverLedger();
            setPreview(data);
            setMode("restore");
          })
        }
      />
      {!!error && !mode && (
        <Text style={{ color: c.destructive }}>{error}</Text>
      )}
      <Modal visible={!!mode} animationType="slide" onRequestClose={close}>
        <ScrollView
          contentContainerStyle={{
            backgroundColor: c.background,
            padding: 24,
            paddingTop: insets.top + 24,
            flexGrow: 1,
            gap: 16,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={{ color: c.foreground, fontSize: 24, fontWeight: "700" }}
          >
            {mode === "export" ? "Export backup" : "Restore backup"}
          </Text>
          {!preview ? (
            <>
              {mode === "restore" && (
                <Button
                  title={
                    raw
                      ? "Choose a different backup file"
                      : "Choose backup file"
                  }
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      const file = await pickFile(10 * 1024 * 1024);
                      if (file) setRaw(file);
                    })
                  }
                />
              )}
              <Text style={{ color: c.mutedForeground }}>
                Backup password (at least 10 characters for export)
              </Text>
              <TextInput
                accessibilityLabel="Backup password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={setPassword}
                editable={!busy}
                style={{
                  borderWidth: 1,
                  borderColor: c.border,
                  borderRadius: 8,
                  padding: 12,
                  color: c.foreground,
                }}
              />
              {mode === "export" && (
                <TextInput
                  accessibilityLabel="Confirm backup password"
                  placeholder="Confirm password"
                  placeholderTextColor={c.mutedForeground}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!busy}
                  style={{
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 8,
                    padding: 12,
                    color: c.foreground,
                  }}
                />
              )}
              <Button
                title={
                  busy
                    ? "Working…"
                    : mode === "export"
                      ? "Encrypt and save / share"
                      : "Decrypt and preview"
                }
                disabled={busy || !password || (mode === "restore" && !raw)}
                onPress={() =>
                  void run(async () => {
                    if (mode === "export") {
                      if (password !== confirmPassword)
                        throw Error("Passwords do not match.");
                      const encrypted = await encryptBackup(
                        ledgerSchema.parse(await app.exportData()),
                        password,
                        Crypto.getRandomBytes,
                      );
                      await shareFile(
                        "profinancer-encrypted-backup.json",
                        encrypted,
                      );
                      setPassword("");
                      setConfirmPassword("");
                      setMode(null);
                    } else {
                      const data = await decryptBackup(raw, password);
                      setPreview(data);
                      setPassword("");
                      setRaw("");
                    }
                  })
                }
              />
            </>
          ) : (
            <>
              <Text style={{ color: c.foreground }}>
                Ready to restore {preview.expenses.length} expenses,{" "}
                {preview.incomes.length} income entries, {preview.goals.length}{" "}
                goals, {preview.billGroups.length} groups and{" "}
                {preview.budgets.length} budgets.
              </Text>
              <Text style={{ color: c.mutedForeground }}>
                This replaces your current local ledger. A recovery copy is
                created first. Organizer ownership from this encrypted backup is
                restored; shared copies stay shared. New notifications remain
                queued during restore.
              </Text>
              <Button
                title="Replace local data"
                disabled={busy}
                onPress={() =>
                  confirmAction(
                    "Replace current ledger?",
                    "Your current data will be saved as a recovery copy before replacement.",
                    restore,
                  )
                }
              />
            </>
          )}
          {!!error && <Text style={{ color: c.destructive }}>{error}</Text>}
          <Button
            title="Cancel"
            variant="ghost"
            disabled={busy}
            onPress={close}
          />
        </ScrollView>
      </Modal>
    </Card>
  );
}
