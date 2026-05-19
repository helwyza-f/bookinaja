import { apiFetch } from "@/lib/api";

type Audience = "admin" | "customer" | "none";

type UploadResult = {
  localUri: string;
  url: string;
};

export async function pickAndUploadImage(params: {
  endpoint: string;
  audience?: Audience;
  fieldName?: string;
  quality?: number;
}) {
  const { endpoint, audience = "admin", fieldName = "image", quality = 0.85 } = params;

  let ImagePicker: typeof import("expo-image-picker");
  try {
    ImagePicker = await import("expo-image-picker");
  } catch {
    throw new Error("Dev client belum memuat module upload gambar. Rebuild app dulu.");
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Izin galeri dibutuhkan untuk upload gambar.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    quality,
  });

  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }

  const asset = result.assets[0];
  const localUri = asset.uri;
  const fileName = asset.fileName || `upload-${Date.now()}.jpg`;
  const mimeType = asset.mimeType || guessMimeType(localUri);

  const formData = new FormData();
  formData.append(fieldName, {
    uri: localUri,
    name: fileName,
    type: mimeType,
  } as never);

  const uploaded = await apiFetch<{ url?: string }>(endpoint, {
    audience,
    method: "POST",
    body: formData,
  });

  return {
    localUri,
    url: uploaded.url || "",
  } satisfies UploadResult;
}

function guessMimeType(uri: string) {
  const normalized = String(uri || "").toLowerCase();
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".webp")) return "image/webp";
  if (normalized.endsWith(".heic")) return "image/heic";
  return "image/jpeg";
}
