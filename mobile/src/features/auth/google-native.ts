import { Platform } from "react-native";
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import {
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
} from "@/constants/app";

let configured = false;

export function configureGoogleNativeSignIn() {
  if (configured) return;

  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    offlineAccess: false,
  });

  configured = true;
}

export async function getGoogleIdToken() {
  configureGoogleNativeSignIn();

  if (Platform.OS === "android") {
    await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });
  }

  try {
    const result = await GoogleSignin.signIn();
    if (result.type !== "success") {
      throw new Error("Login Google dibatalkan.");
    }

    const idToken = result.data.idToken;
    if (!idToken) {
      throw new Error(
        "Google belum mengirim idToken. Pastikan web client ID yang dipakai benar.",
      );
    }

    return idToken;
  } catch (error) {
    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          throw new Error("Login Google dibatalkan.");
        case statusCodes.IN_PROGRESS:
          throw new Error("Login Google masih diproses.");
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new Error("Google Play Services belum tersedia di emulator ini.");
        default:
          throw new Error(error.message || "Google login belum berhasil.");
      }
    }

    throw error instanceof Error
      ? error
      : new Error("Google login belum berhasil.");
  }
}

export async function signOutGoogleNative() {
  configureGoogleNativeSignIn();

  try {
    await GoogleSignin.signOut();
  } catch {
    // Best-effort only; app session sign-out should still continue.
  }
}
