import { Platform } from "react-native";

const FALLBACK_API_URL = "http://api.bookinaja.local:8080/api/v1";
const FALLBACK_ANDROID_API_URL = "http://10.0.2.2:8080/api/v1";
const FALLBACK_WEB_URL = "http://lvh.me:3000";

function normalizeUrl(value: string | undefined, fallback: string) {
  const trimmed = (value || "").trim();
  return trimmed || fallback;
}

export const env = {
  apiUrl:
    Platform.OS === "android"
      ? normalizeUrl(
          process.env.EXPO_PUBLIC_API_URL_ANDROID || process.env.EXPO_PUBLIC_API_URL,
          FALLBACK_ANDROID_API_URL,
        )
      : normalizeUrl(process.env.EXPO_PUBLIC_API_URL, FALLBACK_API_URL),
  webUrl: normalizeUrl(process.env.EXPO_PUBLIC_WEB_URL, FALLBACK_WEB_URL),
  googleWebClientId: normalizeUrl(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, ""),
  googleIosClientId: normalizeUrl(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, ""),
  googleAndroidClientId: normalizeUrl(
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    "",
  ),
};
