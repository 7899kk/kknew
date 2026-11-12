import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Crypto from "expo-crypto";
import { Image, Platform } from "react-native";

export async function pickProfilePhoto(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "image/*",
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  try {
    if (asset.size && asset.size > 8 * 1024 * 1024)
      throw Error("Choose a photo smaller than 8 MB.");
    if (Platform.OS === "web") {
      if (!asset.file) throw Error("Please choose an image file.");
      const url = URL.createObjectURL(asset.file);
      try {
        const image = new window.Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const size = Math.min(image.naturalWidth, image.naturalHeight);
        const context = canvas.getContext("2d");
        if (!context) throw Error("Could not prepare this photo.");
        context.drawImage(
          image,
          (image.naturalWidth - size) / 2,
          (image.naturalHeight - size) / 2,
          size,
          size,
          0,
          0,
          256,
          256,
        );
        return canvas.toDataURL("image/jpeg", 0.65);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    const info = await FileSystem.getInfoAsync(asset.uri);
    if (!info.exists || info.size > 8 * 1024 * 1024)
      throw Error("Choose a photo smaller than 8 MB.");
    await new Promise<void>((resolve, reject) =>
      Image.getSize(
        asset.uri,
        () => resolve(),
        () =>
          reject(
            Error("This image cannot be opened. Choose a JPG or PNG photo."),
          ),
      ),
    );
    if (!FileSystem.documentDirectory)
      throw Error("Photo storage is unavailable.");
    const folder = FileSystem.documentDirectory + "profile-photos/";
    await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
    const destination = folder + Crypto.randomUUID() + ".image";
    await FileSystem.copyAsync({ from: asset.uri, to: destination });
    return destination;
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

export async function removeOldProfilePhoto(uri?: string) {
  const folder =
    FileSystem.documentDirectory &&
    FileSystem.documentDirectory + "profile-photos/";
  if (Platform.OS !== "web" && folder && uri?.startsWith(folder))
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
}
