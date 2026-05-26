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

export type SignupResponse = {
  account: Account;
  verification_required: boolean;
  email_sent: boolean;
  message: string;
};

export type EmailVerificationResponse = {
  email?: string;
  message: string;
};

export type AuthMeResponse = {
  account: Account;
  workspaces: Workspace[];
};

export async function signupAccount(input: {
  email: string;
  password: string;
  referral_code?: string;
}) {
  const res = await api.post<SignupResponse>("/auth/signup", input);
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

export async function requestAccountEmailVerification(email: string) {
  const res = await api.post<EmailVerificationResponse>("/auth/email/verify/request", { email });
  return res.data;
}

export async function verifyAccountEmail(token: string) {
  const res = await api.post<EmailVerificationResponse>("/auth/email/verify", { token });
  return res.data;
}

export async function getAccountMe() {
  const res = await api.get<AuthMeResponse>("/auth/account/me");
  return {
    ...res.data,
    workspaces: Array.isArray(res.data?.workspaces) ? res.data.workspaces : [],
  };
}
