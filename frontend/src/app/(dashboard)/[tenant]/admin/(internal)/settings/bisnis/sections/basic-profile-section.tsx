"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionShell } from "./section-shell";
import type { SectionProps } from "./types";

export function BasicProfileSection({ profile, saving, onSave }: SectionProps) {
  const [draft, setDraft] = useState({
    name: profile.name || "",
    slug: profile.slug || "",
    business_category: profile.business_category || "",
    business_type: profile.business_type || "",
  });
  const [editing, setEditing] = useState(false);

  const resetDraft = () => {
    setDraft({
      name: profile.name || "",
      slug: profile.slug || "",
      business_category: profile.business_category || "",
      business_type: profile.business_type || "",
    });
  };

  return (
    <SectionShell
      title="Profil Dasar"
      description="Identitas utama bisnis yang dipakai di dashboard dan landing public."
      icon={Building2}
      saving={saving}
      editing={editing}
      onEdit={() => setEditing(true)}
      onCancel={() => {
        resetDraft();
        setEditing(false);
      }}
      onSave={() => {
        onSave(draft);
        setEditing(false);
      }}
      view={
        <ProfilePreview
          name={profile.name}
          slug={profile.slug}
          category={profile.business_category as string}
          type={profile.business_type as string}
          logoUrl={profile.logo_url}
          primaryColor={profile.primary_color}
        />
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nama bisnis">
          <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </Field>
        <Field label="Slug public">
          <Input value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} />
        </Field>
        <Field label="Kategori bisnis">
          <Input value={draft.business_category} onChange={(event) => setDraft({ ...draft, business_category: event.target.value })} />
        </Field>
        <Field label="Tipe bisnis">
          <Input value={draft.business_type} onChange={(event) => setDraft({ ...draft, business_type: event.target.value })} />
        </Field>
      </div>
    </SectionShell>
  );
}

function ProfilePreview({
  name,
  slug,
  category,
  type,
  logoUrl,
  primaryColor,
}: {
  name?: string;
  slug?: string;
  category?: string;
  type?: string;
  logoUrl?: string;
  primaryColor?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <PreviewChip label="Nama" ready={Boolean(name)} />
        <PreviewChip label="Slug" ready={Boolean(slug)} />
        <PreviewChip label="Kategori" ready={Boolean(category)} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-white/[0.03]">
        <div className="flex items-start gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-lg font-semibold text-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800"
            style={{ backgroundColor: logoUrl ? undefined : primaryColor || "#3b82f6" }}
          >
            {logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={logoUrl} alt="Logo bisnis" className="h-full w-full object-contain p-2" />
            ) : (
              (name || "B").trim().charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-xl font-semibold text-slate-950 dark:text-white">
              {name || "Nama bisnis"}
            </h3>
            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
              {slug ? `${slug}.bookinaja.com` : "slug.bookinaja.com"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800">
                {category || "Kategori bisnis"}
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800">
                {type || "Tipe bisnis"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewChip({
  label,
  ready,
}: {
  label: string;
  ready: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-white/[0.03] dark:text-slate-200">
      <span className={`h-2 w-2 rounded-full ${ready ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`} />
      {label}: {ready ? "Terisi" : "Belum"}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</Label>
      {children}
    </div>
  );
}
