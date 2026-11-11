import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { Platform } from "react-native";
export async function shareFile(name: string, content: string) {
  if (!/^[A-Za-z0-9_.-]{1,240}$/.test(name))
    throw Error("Unsupported export filename.");
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(
      new Blob([content], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (!(await Sharing.isAvailableAsync()))
    throw Error("File sharing is unavailable on this device.");
  const uri = FileSystem.cacheDirectory + name;
  try {
    await FileSystem.writeAsStringAsync(uri, content);
    await Sharing.shareAsync(uri, {
      mimeType: "application/json",
      dialogTitle: "Share Pro Financer file",
      UTI: "public.json",
    });
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  }
}
export async function pickFile(
  maxBytes = 5 * 1024 * 1024,
): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain", "application/octet-stream"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  try {
    if (asset.size && asset.size > maxBytes) throw Error("File is too large.");
    if (Platform.OS === "web") {
      const file = asset.file;
      if (!file) throw Error("Select a file from this device.");
      if (file.size > maxBytes) throw Error("File is too large.");
      return await file.text();
    }
    const info = await FileSystem.getInfoAsync(asset.uri);
    if (!info.exists || info.size > maxBytes)
      throw Error("File is missing or too large.");
    const raw = await FileSystem.readAsStringAsync(asset.uri);
    if (new TextEncoder().encode(raw).length > maxBytes)
      throw Error("File is too large.");
    return raw;
  } finally {
    if (
      Platform.OS !== "web" &&
      asset.uri.startsWith(FileSystem.cacheDirectory || "\0")
    )
      await FileSystem.deleteAsync(asset.uri, { idempotent: true }).catch(
        () => {},
      );
  }
}
