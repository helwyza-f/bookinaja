import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuthGuard } from "@/hooks/use-auth-guard";

export type AdminIdentity = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  tenant_id?: string;
  permission_keys?: string[];
  logo_url?: string;
};

type AdminIdentityResponse = {
  status?: string;
  user?: AdminIdentity | null;
};

export function useAdminIdentity() {
  const guard = useAuthGuard("admin");

  return useQuery({
    queryKey: ["admin-identity"],
    queryFn: async () => {
      const response = await apiFetch<AdminIdentityResponse>("/auth/me", {
        audience: "admin",
      });
      return response?.user || {};
    },
    enabled: guard.ready,
    staleTime: 60_000,
  });
}
