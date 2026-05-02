"use client";

import { useState } from "react";
import { Plus, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SectionShell, ViewItem } from "./section-shell";
import type { SectionProps } from "./types";

export function LandingContentSection({ profile, saving, onSave }: SectionProps) {
  const [featureInput, setFeatureInput] = useState("");
  const [draft, setDraft] = useState({
    slogan: profile.slogan || "",
    tagline: profile.tagline || "",
    about_us: profile.about_us || "",
    features: profile.features || [],
  });
  const [editing, setEditing] = useState(false);

  const resetDraft = () => {
    setDraft({
      slogan: profile.slogan || "",
      tagline: profile.tagline || "",
      about_us: profile.about_us || "",
      features: profile.features || [],
    });
    setFeatureInput("");
  };

  const addFeature = () => {
    const next = featureInput.trim();
    if (!next) return;
    setDraft({ ...draft, features: [...draft.features, next] });
    setFeatureInput("");
  };

  const removeFeature = (index: number) => {
    setDraft({ ...draft, features: draft.features.filter((_, i) => i !== index) });
  };

  return (
    <SectionShell
      title="Landing & Header"
      description="Copy utama untuk hero, header landing, dan poin penjualan."
      icon={FileText}
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
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <ViewItem label="Slogan" value={profile.slogan} />
            <ViewItem label="Headline" value={profile.tagline} />
          </div>
          <ViewItem label="Tentang bisnis" value={profile.about_us} />
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-xs text-slate-500 dark:text-slate-400">Selling points</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.features?.length ? profile.features.map((feature, index) => (
                <span key={`${feature}-${index}`} className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-[#0f0f17] dark:text-slate-200 dark:ring-white/10">
                  {feature}
                </span>
              )) : <span className="text-sm text-slate-400">-</span>}
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Slogan pendek">
            <Input value={draft.slogan} onChange={(event) => setDraft({ ...draft, slogan: event.target.value })} />
          </Field>
          <Field label="Headline / tagline">
            <Input value={draft.tagline} onChange={(event) => setDraft({ ...draft, tagline: event.target.value })} />
          </Field>
        </div>

        <Field label="Tentang bisnis">
          <Textarea
            value={draft.about_us}
            onChange={(event) => setDraft({ ...draft, about_us: event.target.value })}
            className="min-h-32"
          />
        </Field>

        <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Selling points</Label>
          <div className="flex gap-2">
            <Input
              value={featureInput}
              onChange={(event) => setFeatureInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addFeature();
                }
              }}
              placeholder="Contoh: Lapangan indoor"
            />
            <Button type="button" onClick={addFeature} className="h-10 rounded-xl">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex min-h-10 flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/[0.03]">
            {draft.features.length === 0 ? (
              <span className="px-2 py-1 text-sm text-slate-400">Belum ada selling point</span>
            ) : (
              draft.features.map((feature, index) => (
                <span
                  key={`${feature}-${index}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-[color:rgba(59,130,246,0.18)] bg-[var(--bookinaja-50)] px-2.5 py-1 text-xs font-medium text-[var(--bookinaja-700)] dark:border-[color:rgba(96,165,250,0.18)] dark:bg-[color:rgba(59,130,246,0.14)] dark:text-[var(--bookinaja-200)]"
                >
                  {feature}
                  <button type="button" onClick={() => removeFeature(index)} aria-label="Hapus feature">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </SectionShell>
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
