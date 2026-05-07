import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SESSION_STORAGE_KEY } from "@/constants/app";
import type { SessionSnapshot } from "@/types/session";

export async function readSessionSnapshot() {
  const raw =
    Platform.OS === "web"
      ? await AsyncStorage.getItem(SESSION_STORAGE_KEY)
      : await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionSnapshot;
  } catch {
    return null;
  }
}

export async function writeSessionSnapshot(snapshot: SessionSnapshot) {
  const value = JSON.stringify(snapshot);
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, value);
    return;
  }

  await SecureStore.setItemAsync(SESSION_STORAGE_KEY, value);
}

export async function clearSessionSnapshot() {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
}
