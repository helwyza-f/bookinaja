"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SectionShell, ViewItem } from "./section-shell";
import type { SectionProps } from "./types";

export function SeoSection({ profile, saving, onSave }: SectionProps) {
  const [draft, setDraft] = useState({
    meta_title: profile.meta_title || "",
    meta_description: profile.meta_description || "",
  });
  const [editing, setEditing] = useState(false);

  const resetDraft = () => {
    setDraft({
      meta_title: profile.meta_title || "",
      meta_description: profile.meta_description || "",
    });
  };

  return (
    <SectionShell
      title="SEO"
      description="Judul dan deskripsi yang dipakai mesin pencari dan preview share."
      icon={Search}
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
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-3">
            <ViewItem label="Meta title" value={profile.meta_title} />
            <ViewItem label="Meta description" value={profile.meta_description} />
          </div>
          <SearchPreview title={profile.meta_title || profile.name} description={profile.meta_description} slug={profile.slug} />
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Field label="Meta title">
            <Input value={draft.meta_title} onChange={(event) => setDraft({ ...draft, meta_title: event.target.value })} />
          </Field>
          <Field label="Meta description">
            <Textarea
              value={draft.meta_description}
              onChange={(event) => setDraft({ ...draft, meta_description: event.target.value })}
              className="min-h-28"
            />
          </Field>
        </div>
        <SearchPreview title={draft.meta_title || profile.name} description={draft.meta_description} slug={profile.slug} />
      </div>
    </SectionShell>
  );
}

function SearchPreview({ title, description, slug }: { title?: string; description?: string; slug?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="truncate text-sm text-[#1a0dab]">{title || "Judul halaman"}</p>
      <p className="mt-1 truncate text-xs text-[#006621]">https://{slug || "tenant"}.bookinaja.com</p>
      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        {description || "Deskripsi SEO belum diisi."}
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-slate-500">{label}</Label>
      {children}
    </div>
  );
}
