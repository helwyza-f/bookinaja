import { useEffect, useMemo, useState } from "react";
import { getCookie } from "cookies-next";
import api from "@/lib/api";

type SessionCustomer = {
  id?: string;
  name?: string;
  phone?: string;
  email?: string | null;
  avatar_url?: string | null;
  tier?: string;
};

type CustomerSummaryResponse = {
  customer_id?: string;
  customer?: SessionCustomer;
};

export function useCustomerSessionPreview(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false;
  const [customer, setCustomer] = useState<SessionCustomer | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setCustomer(null);
      setLoading(false);
      return;
    }

    const token = String(getCookie("customer_auth") || "").trim();
    if (!token) {
      setCustomer(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    const fetchCustomer = async () => {
      try {
        const res = await api.get<CustomerSummaryResponse>("/user/me/summary", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!active) return;
        setCustomer(res.data?.customer || null);
      } catch {
        if (!active) return;
        setCustomer(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchCustomer();
    return () => {
      active = false;
    };
  }, [enabled]);

  const firstName = useMemo(
    () => String(customer?.name || "").trim().split(" ").filter(Boolean)[0] || "",
    [customer?.name],
  );

  return {
    customer,
    firstName,
    loading,
    isAuthenticated: Boolean(customer?.id || customer?.name || customer?.phone),
  };
}
