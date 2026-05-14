import { Platform } from "react-native";
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { env } from "@/lib/env";

let configured = false;

export function configureGoogleNativeSignIn() {
  if (configured || Platform.OS === "web") return;

  GoogleSignin.configure({
    webClientId: env.googleWebClientId || undefined,
    iosClientId: env.googleIosClientId || undefined,
    offlineAccess: false,
    profileImageSize: 120,
  });

  configured = true;
}

export async function getGoogleIdToken() {
  if (Platform.OS === "web") {
    throw new Error("Google native sign-in hanya dipakai di Android emulator atau device native.");
  }

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
        "Google belum mengirim idToken. Pastikan Google client ID di env mobile dan backend sudah sinkron.",
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
  if (Platform.OS === "web") return;

  configureGoogleNativeSignIn();

  try {
    await GoogleSignin.signOut();
  } catch {
    // Best effort only.
  }
}
