import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";
import type { CapturedPayment } from "./paymentModels";
export { sourceNames } from "./paymentModels";
export type { CapturedPayment } from "./paymentModels";
export type CaptureStatus = {
  smsGranted?: boolean;
  smsEnabled?: boolean;
  smsSetupHandled?: boolean;
  granted: boolean;
  enabled: boolean;
  overflow: boolean;
  notificationsGranted?: boolean;
  alertsEnabled?: boolean;
  listenerConnected?: boolean;
  pendingCount?: number;
  lastObserved?: number;
  lastImported?: number;
  lastError?: string;
};
interface Bridge {
  status(): Promise<CaptureStatus>;
  requestSmsPermissions(): Promise<{granted:boolean;canAskAgain?:boolean}>;
  setSmsEnabled(value:boolean): Promise<void>;
  dismissSmsSetup(): Promise<void>;
  openSmsAppSettings(): Promise<void>;
  openSettings(): Promise<void>;
  requestNotifications(): Promise<void>;
  openAppNotificationSettings(): Promise<void>;
  setAlertsEnabled(value: boolean): Promise<void>;
  testNotification(direction: "income" | "expense"): Promise<boolean>;
  setEnabled(value: boolean): Promise<void>;
  pending(): Promise<string>;
  acknowledge(ids: string[]): Promise<void>;
  clear(): Promise<void>;
  markImported?(): Promise<void>;
}
export const notificationBridge =
  Platform.OS === "android"
    ? requireOptionalNativeModule<Bridge>("MoneyNotifications")
    : null;
