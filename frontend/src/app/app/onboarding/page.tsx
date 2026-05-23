"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccountMe } from "@/lib/auth-client";

export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const me = await getAccountMe();
        if (!alive) return;
        const workspace = me.workspaces[0];
        if (!workspace) {
          router.replace("/app/workspaces/new");
          return;
        }
        const step = workspace.onboarding_state?.current_step || "template";
        router.replace(`/app/onboarding/${step}?workspace=${workspace.id}&slug=${workspace.slug}`);
      } catch {
        if (alive) router.replace("/login?next=/app/onboarding");
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
        Menyiapkan onboarding...
      </div>
    </main>
  );
}
