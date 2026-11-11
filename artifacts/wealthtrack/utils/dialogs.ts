import { Alert, Platform } from "react-native";
export function confirmAction(
  title: string,
  message: string,
  action: () => void,
) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) action();
  } else
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: action },
    ]);
}
export function notify(title: string, message: string) {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}
