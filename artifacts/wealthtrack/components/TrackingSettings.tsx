import React, { useEffect, useState } from "react";
import {
  AppState,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { Button, Card } from "./UI";
import { notificationBridge as bridge } from "@/utils/notificationBridge";
import type { CaptureStatus } from "@/utils/notificationBridge";

export function TrackingSettings({
  automatic = false,
}: {
  automatic?: boolean;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useApp();
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<CaptureStatus>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refresh = async () => {
    if (bridge) setStatus(await bridge.status());
  };
  useEffect(() => {
    if (!bridge) return;
    let live = true;
    bridge
      .status()
      .then((s) => {
        if (live) {
          setStatus(s);
          if (automatic && profile.onboardingComplete && !s.smsSetupHandled)
            setVisible(true);
        }
      })
      .catch(() => {});
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void refresh().catch(() => {});
    });
    return () => {
      live = false;
      sub.remove();
    };
  }, [automatic, profile.onboardingComplete]);
  const action = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const close = () => {
    void action(async () => {
      await bridge?.dismissSmsSetup();
      setVisible(false);
    });
  };
  const enable = () =>
    action(async () => {
      if (!bridge) return;
      const result = status?.smsGranted
        ? { granted: true }
        : await bridge.requestSmsPermissions();
      await bridge.dismissSmsSetup();
      if (result.granted) {
        await bridge!.setSmsEnabled(true);
        if (automatic) setVisible(false);
        await bridge!.requestNotifications();
      } else
        setError(
          "SMS access is off. Allow it in app settings to track payments.",
        );
    });
  return (
    <>
      {!automatic && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Payment tracking settings"
          onPress={() => {
            setVisible(true);
            void refresh().catch(() => {});
          }}
          style={{ padding: 12 }}
        >
          <Feather name="sliders" size={23} color={colors.foreground} />
        </Pressable>
      )}
      <Modal visible={visible} animationType="slide" onRequestClose={close}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: 24,
            paddingTop: insets.top + 32,
            paddingBottom: insets.bottom + 24,
            gap: 18,
            backgroundColor: colors.background,
          }}
        >
          <View style={{ alignItems: "center", gap: 14, paddingVertical: 24 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                backgroundColor: colors.primary + "18",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="message-square" size={38} color={colors.primary} />
            </View>
            <Text
              style={{
                fontSize: 27,
                fontWeight: "700",
                color: colors.foreground,
              }}
            >
              Track payments
            </Text>
            <Text
              style={{
                textAlign: "center",
                color: colors.mutedForeground,
                fontSize: 15,
              }}
            >
              Bank SMS → income & expenses
            </Text>
          </View>
          {bridge ? (
            <>
              <Card>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <Feather
                    name={
                      status?.smsEnabled && status.smsGranted
                        ? "check-circle"
                        : "lock"
                    }
                    size={24}
                    color={colors.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: "600",
                        color: colors.foreground,
                      }}
                    >
                      Bank SMS
                    </Text>
                    <Text
                      style={{ color: colors.mutedForeground, marginTop: 4 }}
                    >
                      {status?.smsEnabled && status.smsGranted
                        ? "Tracking new payments"
                        : status?.smsGranted
                          ? "Off"
                          : "Permission required"}
                    </Text>
                  </View>
                  {status?.smsEnabled && status.smsGranted && (
                    <Switch
                      accessibilityLabel="SMS tracking"
                      value
                      onValueChange={() =>
                        action(() => bridge!.setSmsEnabled(false))
                      }
                      disabled={busy}
                    />
                  )}
                </View>
              </Card>
              <Text
                style={{ color: colors.mutedForeground, textAlign: "center" }}
              >
                Processed on your phone. Failed payments and OTPs are skipped.
                Unclear payments need your review.
              </Text>
              {(!status?.smsEnabled || !status?.smsGranted) && (
                <Button
                  title="Enable SMS"
                  icon="message-square"
                  onPress={enable}
                  disabled={busy}
                />
              )}
              {!!error && (
                <>
                  <Text
                    accessibilityRole="alert"
                    style={{ color: colors.destructive }}
                  >
                    {error}
                  </Text>
                  <Button
                    title="Open app permissions"
                    variant="secondary"
                    onPress={() => action(() => bridge!.openSmsAppSettings())}
                  />
                </>
              )}
              {!automatic && (
                <>
                  <Card>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <Feather name="bell" size={24} color={colors.primary} />
                      <Text
                        style={{
                          flex: 1,
                          color: colors.foreground,
                          fontSize: 17,
                        }}
                      >
                        Payment alerts
                      </Text>
                      <Switch
                        accessibilityLabel="Payment alerts"
                        disabled={busy}
                        value={status?.alertsEnabled ?? true}
                        onValueChange={(value) =>
                          action(async () => {
                            await bridge!.setAlertsEnabled(value);
                            if (value) await bridge!.requestNotifications();
                          })
                        }
                      />
                    </View>
                  </Card>
                  {!status?.notificationsGranted && (
                    <Button
                      title="Allow payment alerts"
                      variant="secondary"
                      onPress={() =>
                        action(() => bridge!.requestNotifications())
                      }
                    />
                  )}
                  <Button
                    title="Notification settings"
                    variant="ghost"
                    onPress={() =>
                      action(() => bridge!.openAppNotificationSettings())
                    }
                  />
                  {!!status?.lastError && (
                    <Text style={{ color: colors.destructive }}>
                      {status.lastError}
                    </Text>
                  )}
                  {status?.overflow && (
                    <Text style={{ color: colors.destructive }}>
                      Capture storage full. Check your statement for missing
                      payments.
                    </Text>
                  )}
                </>
              )}
            </>
          ) : (
            <Text
              style={{ color: colors.mutedForeground, textAlign: "center" }}
            >
              SMS tracking is available in the Android app.
            </Text>
          )}
          <Button
            title={automatic ? "Not now" : "Done"}
            variant="ghost"
            onPress={close}
            disabled={busy}
          />
        </ScrollView>
      </Modal>
    </>
  );
}
