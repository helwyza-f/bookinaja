"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAccountMe, type AuthMeResponse } from "@/lib/auth-client";
import { clearTenantSession } from "@/lib/tenant-session";
import { getTenantAdminEntryUrl } from "@/lib/workspace-entry";

export default function WorkspacesPage() {
  const router = useRouter();
  const [items, setItems] = useState<AuthMeResponse["workspaces"]>([]);
  const [account, setAccount] = useState<AuthMeResponse["account"] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const me = await getAccountMe();
        if (!alive) return;
        setAccount(me.account);
        setItems(me.workspaces);
        if (me.workspaces.length === 0) {
          router.replace("/app/workspaces/new");
        }
      } catch {
        if (!alive) return;
        router.replace("/login?next=/app/workspaces");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [router]);

  function handleSignOut() {
    clearTenantSession();
    router.replace("/login?signed_out=1");
  }

  const initials =
    (account?.name || account?.email || "A")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((item) => item[0])
      .join("")
      .toUpperCase() || "A";

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-8">
      <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Login sebagai
          </p>
          <div className="mt-1 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">
                {account?.name || "Owner Bookinaja"}
              </p>
              <p className="text-xs text-slate-500">
                {account?.email || "Memuat akun..."}
              </p>
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 shrink-0"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Keluar
        </Button>
      </div>

      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#10275c] text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-semibold tracking-normal">Workspace</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Pilih bisnis yang mau dikelola. Area admin tetap terbuka di subdomain masing-masing.
          </p>
        </div>
        <Button asChild className="h-10 w-full sm:w-auto">
          <Link href="/app/workspaces/new">
            <Plus className="mr-2 h-4 w-4" />
            Workspace baru
          </Link>
        </Button>
      </header>

      <section className="mt-6">
        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
            Memuat workspace...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Belum ada workspace</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Buat workspace pertama untuk mulai onboarding bisnis.
            </p>
            <Button asChild className="mt-4 h-10">
              <Link href="/app/workspaces/new">Buat workspace</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <a
                key={item.id}
                href={
                  item.onboarding_state?.is_completed
                    ? getTenantAdminEntryUrl(item.slug, "/admin/dashboard")
                    : `/app/onboarding/${item.onboarding_state?.current_step || "template"}?workspace=${item.id}&slug=${item.slug}`
                }
                className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-[#174ea6] sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-base font-semibold">{item.name}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {item.slug}.bookinaja.com / {item.role || "member"} /{" "}
                    {item.onboarding_state?.is_completed ? "live" : "onboarding"}
                  </div>
                </div>
                <div className="inline-flex items-center text-sm font-semibold text-[#174ea6]">
                  {item.onboarding_state?.is_completed ? "Buka admin" : "Lanjut onboarding"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
