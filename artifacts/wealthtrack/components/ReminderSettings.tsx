import React, { useEffect, useState } from "react";
import { AppState, Platform, Text, View } from "react-native";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { notificationBridge } from "@/utils/notificationBridge";
import { paymentReminders, remindersDue } from "@/utils/paymentReminders";
import { Button, Card, formatCurrencyFull } from "./UI";
export function ReminderSettings() {
  const app = useApp(),
    c = useColors(),
    [allowed, setAllowed] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const refresh = () => {
      notificationBridge
        ?.status()
        .then((s) => {
          if (active) setAllowed(!!s.notificationsGranted);
        })
        .catch(() => {
          if (active) setError("Could not read notification settings.");
        });
    };
    refresh();
    const timer = setInterval(refresh, 3000);
    const sub = AppState.addEventListener("change", (v) => {
      if (v === "active") refresh();
    });
    return () => {
      active = false;
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  const enable = async () => {
    try {
      setError("");
      await notificationBridge?.requestNotifications();
      app.setRemindersEnabled(true);
      const status = await notificationBridge?.status();
      setAllowed(!!status?.notificationsGranted);
    } catch {
      setError("Open notification settings and allow payment alerts.");
    }
  };
  const due = remindersDue(paymentReminders(app));
  const sendNow = async () => {
    try {
      await notificationBridge?.syncReminders(
        true,
        JSON.stringify(paymentReminders(app)),
      );
      await notificationBridge?.sendDueReminderNow();
    } catch {
      setError("Could not send reminder. Check notification settings.");
    }
  };
  return (
    <Card>
      <Text
        style={{
          color: c.foreground,
          fontSize: 18,
          fontFamily: "Inter_700Bold",
        }}
      >
        Payment reminders
      </Text>
      <Text
        style={{ color: c.mutedForeground, fontSize: 13, marginVertical: 12 }}
      >
        From 7 days before the due date, daily around 9 AM until recorded as
        paid. Includes loan EMI and dated debts. Android may delay alerts to
        save battery.
      </Text>
      {Platform.OS === "android" ? (
        <>
          <Button
            title={
              app.remindersEnabled ? "Turn off reminders" : "Enable reminders"
            }
            onPress={() =>
              app.remindersEnabled
                ? app.setRemindersEnabled(false)
                : void enable()
            }
          />
          {app.remindersEnabled && !allowed && (
            <Button
              title="Allow reminder notifications"
              variant="secondary"
              onPress={() => void enable()}
            />
          )}
          {app.remindersEnabled && allowed && due.length > 0 && (
            <Button
              title="Send due reminder now"
              variant="secondary"
              onPress={() => void sendNow()}
            />
          )}
          <Text
            style={{ color: c.mutedForeground, fontSize: 12, marginTop: 8 }}
          >
            {app.remindersEnabled
              ? allowed
                ? "Reminders on"
                : "Allow Android notifications to receive reminders"
              : "Reminders off"}
          </Text>
        </>
      ) : (
        <Text style={{ color: c.mutedForeground }}>
          Phone notifications are available in the Android app. Upcoming
          payments are shown below.
        </Text>
      )}
      {!!(error || app.reminderError) && (
        <Text style={{ color: c.expense, marginTop: 8 }}>
          {error || app.reminderError}
        </Text>
      )}
      <View style={{ gap: 10, marginTop: 12 }}>
        {due.length ? (
          due.slice(0, 10).map((item) => (
            <View key={item.id}>
              <Text style={{ color: c.foreground }}>
                {item.title} · {formatCurrencyFull(item.amount)}
              </Text>
              <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
                Due {item.dueDate}
              </Text>
            </View>
          ))
        ) : (
          <Text style={{ color: c.mutedForeground }}>
            No payments due within 7 days
          </Text>
        )}
      </View>
    </Card>
  );
}
