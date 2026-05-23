import api from "@/lib/api";
import { setAccountAuthCookie, setAdminAuthCookie } from "@/lib/tenant-session";

type Account = {
  id: string;
  name: string;
  email: string;
};

type Workspace = {
  id: string;
  name: string;
  slug: string;
  role?: string;
  onboarding_state?: {
    current_step: string;
    is_completed: boolean;
  };
};

type AuthResponse = {
  token: string;
  account: Account;
};

export type AuthMeResponse = {
  account: Account;
  workspaces: Workspace[];
};

export async function signupAccount(input: {
  name: string;
  email: string;
  password: string;
}) {
  const res = await api.post<AuthResponse>("/auth/signup", input);
  setAccountAuthCookie(res.data.token);
  setAdminAuthCookie(res.data.token);
  return res.data;
}

export async function loginAccount(input: {
  email: string;
  password: string;
}) {
  const res = await api.post<AuthResponse>("/auth/login", input);
  setAccountAuthCookie(res.data.token);
  setAdminAuthCookie(res.data.token);
  return res.data;
}

export async function googleAuthAccount(idToken: string) {
  const res = await api.post<AuthResponse>("/auth/google", { id_token: idToken });
  setAccountAuthCookie(res.data.token);
  setAdminAuthCookie(res.data.token);
  return res.data;
}

export async function getAccountMe() {
  const res = await api.get<AuthMeResponse>("/auth/account/me");
  return res.data;
}
