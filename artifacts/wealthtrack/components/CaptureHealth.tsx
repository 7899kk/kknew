import React from "react";
import { Text } from "react-native";
import { CaptureStatus, notificationBridge } from "@/utils/notificationBridge";
import { useColors } from "@/hooks/useColors";
import { Card, Button } from "./UI";
export function CaptureHealth({
  status,
  onRefresh,
}: {
  status: CaptureStatus;
  onRefresh: () => Promise<void>;
}) {
  const c = useColors();
  if (!notificationBridge) return null;
  const time = (t?: number) => (t ? new Date(t).toLocaleString() : "None yet");
  return (
    <Card>
      <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "700" }}>
        Capture health
      </Text>
      <Text style={{ color: c.foreground, marginTop: 10 }}>
        Permission: {status.granted ? "Allowed" : "Off"} · Capture:{" "}
        {status.enabled ? "Enabled" : "Off"} · Listener:{" "}
        {status.listenerConnected ? "Connected" : "Disconnected"}
      </Text>
      <Text style={{ color: c.mutedForeground, marginVertical: 10 }}>
        Queued events:{" "}
        {status.pendingCount === -1
          ? "Unreadable"
          : (status.pendingCount ?? "Unknown")}
        {`\n`}Last supported-source alert observed: {time(status.lastObserved)}
        {`\n`}Last successful import: {time(status.lastImported)}
      </Text>
      {!!status.lastError && (
        <Text style={{ color: c.destructive, marginBottom: 10 }}>
          {status.lastError}
        </Text>
      )}
      {status.overflow && (
        <Text style={{ color: c.destructive }}>
          The queue filled at least once. Check your statement for missing
          payments.
        </Text>
      )}
      <Text style={{ color: c.mutedForeground, marginBottom: 10 }}>
        No recent alerts does not mean tracking failed. Android force-stop and
        battery restrictions can stop capture. Earlier alerts cannot be
        recovered. This app never stores raw notification text.
      </Text>
      <Button
        title="Refresh capture status"
        variant="secondary"
        onPress={() => void onRefresh()}
      />
      <Button
        title="Open notification access settings"
        variant="ghost"
        onPress={() => void notificationBridge!.openSettings().catch(() => {})}
      />
    </Card>
  );
}
