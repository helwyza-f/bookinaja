"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWorkspace } from "@/lib/workspace-client";

const categories = [
  { id: "gaming_hub", label: "Gaming & Rental" },
  { id: "creative_space", label: "Studio & Creative" },
  { id: "sport_center", label: "Sport & Courts" },
  { id: "social_space", label: "Social & Office" },
];

function slugFromName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewWorkspacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("gaming_hub");
  const [loading, setLoading] = useState(false);

  const resolvedSlug = slugFromName(slug || name);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const workspace = await createWorkspace({
        name,
        slug: resolvedSlug,
        business_category: category,
      });
      toast.success("Workspace dibuat. Lanjut onboarding.");
      router.replace(`/app/onboarding/template?workspace=${workspace.id}&slug=${workspace.slug}`);
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(message || "Workspace belum berhasil dibuat.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-8">
      <Button asChild variant="ghost" className="mb-6 h-9 px-0">
        <Link href="/app/workspaces">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section>
          <h1 className="text-3xl font-semibold tracking-normal">Workspace pertama</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Buat identitas dasar dulu. Konfigurasi operasional masuk ke onboarding berikutnya.
          </p>
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
            </div>

            <Button type="submit" disabled={loading || !name.trim()} className="h-10 w-full">
              {loading ? "Membuat workspace..." : "Buat workspace"}
              {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
