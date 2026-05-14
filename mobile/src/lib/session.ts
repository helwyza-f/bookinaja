import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ADMIN_TOKEN_KEY = "bookinaja.admin.token";
const CUSTOMER_TOKEN_KEY = "bookinaja.customer.token";
const TENANT_SLUG_KEY = "bookinaja.tenant.slug";

function isWeb() {
  return Platform.OS === "web";
}

async function getItem(key: string) {
  if (isWeb()) {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string) {
  if (isWeb()) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, value);
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string) {
  if (isWeb()) {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(key);
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getAdminToken() {
  return getItem(ADMIN_TOKEN_KEY);
}

export async function getCustomerToken() {
  return getItem(CUSTOMER_TOKEN_KEY);
}

export async function getTenantSlug() {
  return getItem(TENANT_SLUG_KEY);
}

export async function saveAdminSession(token: string, tenantSlug?: string | null) {
  await setItem(ADMIN_TOKEN_KEY, token);
  if (tenantSlug) {
    await setItem(TENANT_SLUG_KEY, tenantSlug);
  }
}

export async function saveCustomerSession(token: string, tenantSlug?: string | null) {
  await setItem(CUSTOMER_TOKEN_KEY, token);
  if (tenantSlug) {
    await setItem(TENANT_SLUG_KEY, tenantSlug);
  }
}

export async function clearAdminSession() {
  await deleteItem(ADMIN_TOKEN_KEY);
}

export async function clearCustomerSession() {
  await deleteItem(CUSTOMER_TOKEN_KEY);
}

export async function clearAllSessions() {
  await Promise.all([
    deleteItem(ADMIN_TOKEN_KEY),
    deleteItem(CUSTOMER_TOKEN_KEY),
    deleteItem(TENANT_SLUG_KEY),
  ]);
}
