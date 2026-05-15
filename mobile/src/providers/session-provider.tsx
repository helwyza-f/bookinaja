import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearAdminSession,
  clearAllSessions,
  clearCustomerSession,
  getAdminToken,
  getCustomerToken,
  getTenantSlug,
  saveTenantSlug,
  saveAdminSession,
  saveCustomerSession,
} from "@/lib/session";

type SessionContextValue = {
  isReady: boolean;
  adminToken: string | null;
  customerToken: string | null;
  tenantSlug: string | null;
  setTenantSlug: (tenantSlug: string | null) => Promise<void>;
  setAdminSession: (token: string, tenantSlug?: string | null) => Promise<void>;
  setCustomerSession: (token: string, tenantSlug?: string | null) => Promise<void>;
  signOutAdmin: () => Promise<void>;
  signOutCustomer: () => Promise<void>;
  signOutAll: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [adminToken, setAdminTokenState] = useState<string | null>(null);
  const [customerToken, setCustomerTokenState] = useState<string | null>(null);
  const [tenantSlug, setTenantSlugState] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      const [admin, customer, tenant] = await Promise.all([
        getAdminToken(),
        getCustomerToken(),
        getTenantSlug(),
      ]);

      if (!active) return;
      setAdminTokenState(admin);
      setCustomerTokenState(customer);
      setTenantSlugState(tenant);
      setIsReady(true);
    }

    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      isReady,
      adminToken,
      customerToken,
      tenantSlug,
      async setTenantSlug(nextTenantSlug) {
        if (nextTenantSlug) {
          await saveTenantSlug(nextTenantSlug);
        }
        setTenantSlugState(nextTenantSlug);
      },
      async setAdminSession(token, nextTenantSlug) {
        await saveAdminSession(token, nextTenantSlug);
        setAdminTokenState(token);
        if (nextTenantSlug) setTenantSlugState(nextTenantSlug);
      },
      async setCustomerSession(token, nextTenantSlug) {
        await saveCustomerSession(token, nextTenantSlug);
        setCustomerTokenState(token);
        if (nextTenantSlug) setTenantSlugState(nextTenantSlug);
      },
      async signOutAdmin() {
        await clearAdminSession();
        setAdminTokenState(null);
      },
      async signOutCustomer() {
        await clearCustomerSession();
        setCustomerTokenState(null);
      },
      async signOutAll() {
        await clearAllSessions();
        setAdminTokenState(null);
        setCustomerTokenState(null);
        setTenantSlugState(null);
      },
    }),
    [adminToken, customerToken, isReady, tenantSlug],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return value;
}
