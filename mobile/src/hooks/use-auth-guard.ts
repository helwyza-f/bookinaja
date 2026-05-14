import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useSession } from "@/providers/session-provider";

export function useAuthGuard(kind: "admin" | "customer") {
  const router = useRouter();
  const session = useSession();
  const token = kind === "admin" ? session.adminToken : session.customerToken;

  useEffect(() => {
    if (!session.isReady) return;
    if (token) return;
    router.replace(kind === "admin" ? "/admin/login" : "/user/login");
  }, [kind, router, session.isReady, token]);

  return {
    ready: session.isReady && Boolean(token),
  };
}
