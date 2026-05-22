"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccountMe } from "@/lib/auth-client";
import { getTenantAdminEntryUrl } from "@/lib/workspace-entry";

export default function AccountAppPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Menyiapkan akun...");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const me = await getAccountMe();
        if (!alive) return;
        if (!me.workspaces.length) {
          router.replace("/app/workspaces/new");
          return;
        }
        const lastSlug =
          typeof window !== "undefined"
            ? window.localStorage.getItem("bookinaja:last_workspace_slug")
            : "";
        const target =
          me.workspaces.find((workspace) => workspace.slug === lastSlug) ||
          me.workspaces.find((workspace) => workspace.onboarding_state?.is_completed) ||
          me.workspaces[0];

        if (target.onboarding_state?.is_completed) {
          window.location.href = getTenantAdminEntryUrl(target.slug, "/admin/dashboard");
          return;
        }

        router.replace(
          `/app/onboarding/${target.onboarding_state?.current_step || "template"}?workspace=${target.id}&slug=${target.slug}`,
        );
      } catch {
        if (!alive) return;
        setMessage("Sesi habis. Mengalihkan ke login...");
        router.replace("/login?next=/app");
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
        {message}
      </div>
    </main>
  );
}
