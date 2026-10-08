import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import type { CapturedPayment } from "./paymentModels";
export { sourceNames } from "./paymentModels";
export type { CapturedPayment } from "./paymentModels";
export type CaptureStatus = { granted: boolean; enabled: boolean; overflow: boolean; notificationsGranted?:boolean; alertsEnabled?:boolean };
interface Bridge {
  status(): Promise<CaptureStatus>;
  openSettings(): Promise<void>;
  requestNotifications(): Promise<void>;
  openAppNotificationSettings(): Promise<void>;
  setAlertsEnabled(value:boolean): Promise<void>;
  testNotification(direction:"income"|"expense"): Promise<boolean>;
  setEnabled(value: boolean): Promise<void>;
  pending(): Promise<string>;
  acknowledge(ids: string[]): Promise<void>;
  clear(): Promise<void>;
}
export const notificationBridge = Platform.OS === 'android' ? requireOptionalNativeModule<Bridge>('MoneyNotifications') : null;
