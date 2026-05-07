export type AppRole = "guest" | "customer" | "admin";

export type SessionSnapshot = {
  token: string | null;
  role: AppRole;
  tenantSlug: string | null;
  tenantId: string | null;
  customerId: string | null;
  adminName: string | null;
};
