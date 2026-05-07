import { Platform } from "react-native";

export const APP_NAME = "Bookinaja";

const DEFAULT_API_URL = "http://api.bookinaja.local:8080/api/v1";
const DEFAULT_ANDROID_EMULATOR_API_URL = "http://10.0.2.2:8080/api/v1";

function resolveApiBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === "android") {
    return process.env.EXPO_PUBLIC_API_URL_ANDROID || DEFAULT_ANDROID_EMULATOR_API_URL;
  }

  if (Platform.OS === "web") {
    return process.env.EXPO_PUBLIC_API_URL_WEB || DEFAULT_API_URL;
  }

  return process.env.EXPO_PUBLIC_API_URL_IOS || DEFAULT_API_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();

export const SESSION_STORAGE_KEY = "bookinaja.mobile.session";
