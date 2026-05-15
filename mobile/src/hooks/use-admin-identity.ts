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
};

export function useAdminIdentity() {
  const guard = useAuthGuard("admin");

  return useQuery({
    queryKey: ["admin-identity"],
    queryFn: () => apiFetch<AdminIdentity>("/auth/me", { audience: "admin" }),
    enabled: guard.ready,
    staleTime: 60_000,
  });
}
