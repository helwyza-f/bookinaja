"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionShell, ViewGrid, ViewItem } from "./section-shell";
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
        <ViewGrid>
          <ViewItem label="Nama bisnis" value={profile.name} />
          <ViewItem label="Slug public" value={profile.slug} />
          <ViewItem label="Kategori bisnis" value={profile.business_category as string} />
          <ViewItem label="Tipe bisnis" value={profile.business_type as string} />
        </ViewGrid>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-slate-500">{label}</Label>
      {children}
    </div>
  );
}
