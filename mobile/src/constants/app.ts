import Constants from "expo-constants";
import { Platform } from "react-native";

export const APP_NAME = "Bookinaja";

const DEFAULT_API_URL = "http://api.bookinaja.local:8080/api/v1";
const DEFAULT_ANDROID_EMULATOR_API_URL = "http://10.0.2.2:8080/api/v1";
const DEFAULT_API_PORT = "8080";

function stripPort(host: string) {
  return host.replace(/:\d+$/, "").trim();
}

function resolveExpoHost() {
  const possibleHost =
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri ||
    (
      Constants.expoGoConfig as
        | {
            debuggerHost?: string;
          }
        | null
    )?.debuggerHost ||
    (
      Constants.manifest2 as
        | {
            extra?: {
              expoClient?: {
                hostUri?: string;
              };
            };
          }
        | null
    )?.extra?.expoClient?.hostUri;

  if (!possibleHost) return "";

  const host = stripPort(possibleHost);
  if (!host || host === "localhost" || host === "127.0.0.1") return "";
  return host;
}

function resolveLanApiUrl() {
  const host = resolveExpoHost();
  if (!host) return "";

  const port = process.env.EXPO_PUBLIC_API_PORT || DEFAULT_API_PORT;
  return `http://${host}:${port}/api/v1`;
}

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

  return process.env.EXPO_PUBLIC_API_URL_IOS || resolveLanApiUrl() || DEFAULT_API_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();

export const SESSION_STORAGE_KEY = "bookinaja.mobile.session";

export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
export const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";
export const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "";

function reverseGoogleClientScheme(clientId: string) {
  const normalized = clientId.trim().replace(/\.apps\.googleusercontent\.com$/, "");
  if (!normalized) return "";
  return `com.googleusercontent.apps.${normalized}`;
}

export const GOOGLE_IOS_REDIRECT_SCHEME = reverseGoogleClientScheme(GOOGLE_IOS_CLIENT_ID);
export const GOOGLE_ANDROID_REDIRECT_SCHEME = reverseGoogleClientScheme(GOOGLE_ANDROID_CLIENT_ID);
