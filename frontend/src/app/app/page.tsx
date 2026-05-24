"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccountMe } from "@/lib/auth-client";

export default function AccountAppPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Membuka daftar workspace...");

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
        router.replace("/app/workspaces");
      } catch {
        if (!alive) return;
        setMessage("Sesi habis. Mengalihkan ke login...");
        router.replace("/login?next=/app/workspaces");
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
