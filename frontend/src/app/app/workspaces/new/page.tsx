"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearTenantSession } from "@/lib/tenant-session";
import { createWorkspace } from "@/lib/workspace-client";

const REFERRAL_STORAGE_KEY = "bookinaja_referral_code";

const categories = [
  { id: "gaming_hub", label: "Gaming & Rental" },
  { id: "creative_space", label: "Studio & Creative" },
  { id: "sport_center", label: "Sport & Courts" },
  { id: "social_space", label: "Social & Office" },
  { id: "other", label: "Kategori lain" },
];

function slugFromName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewWorkspacePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f6f8fb]" />}>
      <NewWorkspaceContent />
    </Suspense>
  );
}

function NewWorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("gaming_hub");
  const [customCategory, setCustomCategory] = useState("");
  const [storedReferralCode, setStoredReferralCode] = useState("");
  const [loading, setLoading] = useState(false);

  const resolvedSlug = slugFromName(slug || name);
  const finalCategory = category === "other" ? customCategory.trim() : category;
  const referralCode = useMemo(
    () => (searchParams.get("ref") || storedReferralCode || "").trim().toUpperCase(),
    [searchParams, storedReferralCode],
  );

  useEffect(() => {
    const fromUrl = (searchParams.get("ref") || "").trim().toUpperCase();
    if (fromUrl) {
      window.localStorage.setItem(REFERRAL_STORAGE_KEY, fromUrl);
      setStoredReferralCode(fromUrl);
      return;
    }
    setStoredReferralCode(window.localStorage.getItem(REFERRAL_STORAGE_KEY) || "");
  }, [searchParams]);

  function handleSignOut() {
    clearTenantSession();
    router.replace("/login?signed_out=1");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!finalCategory) {
      toast.error("Isi kategori bisnis dulu.");
      return;
    }
    setLoading(true);
    try {
      const workspace = await createWorkspace({
        name,
        slug: resolvedSlug,
        business_category: finalCategory,
        referral_code: referralCode || undefined,
      });
      if (referralCode) {
        window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
      }
      toast.success("Workspace dibuat. Lanjut onboarding.");
      router.replace(`/app/onboarding/template?workspace=${workspace.id}&slug=${workspace.slug}&category=${encodeURIComponent(finalCategory)}`);
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(message || "Workspace belum berhasil dibuat.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Button asChild variant="ghost" className="h-9 px-0">
          <Link href="/app/workspaces">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Link>
        </Button>
        <Button type="button" variant="outline" className="h-9 shrink-0" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section>
          <h1 className="text-3xl font-semibold tracking-normal">Workspace pertama</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Buat identitas dasar dulu. Konfigurasi operasional masuk ke onboarding berikutnya.
          </p>
          {referralCode ? (
            <p className="mt-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
              Referral aktif: {referralCode}
            </p>
          ) : null}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <form onSubmit={onSubmit} className="space-y-5">
            <label className="block space-y-2">
              <Label>Nama bisnis</Label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: Nexus Gaming Hub"
                required
              />
            </label>

            <label className="block space-y-2">
              <Label>Slug workspace</Label>
              <Input
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder={slugFromName(name) || "nexus-gaming"}
              />
              <p className="text-xs text-slate-500">
                Preview: {resolvedSlug || "workspace"}.bookinaja.com
              </p>
            </label>

            <div className="space-y-2">
              <Label>Kategori</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {categories.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id)}
                    className={`rounded-lg border px-3 py-3 text-left text-sm font-medium transition-colors ${
                      category === item.id
                        ? "border-[#174ea6] bg-[#edf4ff] text-[#10275c]"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {category === "other" ? (
                <Input
                  value={customCategory}
                  onChange={(event) => setCustomCategory(event.target.value)}
                  placeholder="Contoh: Music Rehearsal, Kids Playground, atau lainnya"
                />
              ) : null}
            </div>

            <Button type="submit" disabled={loading || !name.trim() || !finalCategory.trim()} className="h-10 w-full">
              {loading ? "Membuat workspace..." : "Buat workspace"}
              {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
