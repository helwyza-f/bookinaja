"use client";

import { useState } from "react";
import { Plus, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SectionShell } from "./section-shell";
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
        <LandingPreview
          slogan={profile.slogan}
          tagline={profile.tagline}
          about={profile.about_us}
          features={profile.features || []}
          businessName={profile.name}
          bannerUrl={profile.banner_url}
        />
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

function LandingPreview({
  slogan,
  tagline,
  about,
  features,
  businessName,
  bannerUrl,
}: {
  slogan?: string;
  tagline?: string;
  about?: string;
  features: string[];
  businessName?: string;
  bannerUrl?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <PreviewChip label="Slogan" ready={Boolean(slogan)} />
        <PreviewChip label="Headline" ready={Boolean(tagline)} />
        <PreviewChip label="Selling points" ready={features.length > 0} value={`${features.length} item`} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 dark:border-slate-800">
        <div className="relative min-h-[260px] px-5 py-6 sm:px-7 sm:py-8">
          {bannerUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/75 to-slate-950/20" />
            </>
          ) : null}
          <div className="relative max-w-2xl">
            <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/15">
              {slogan || businessName || "Slogan landing"}
            </span>
            <h3 className="mt-5 text-2xl font-semibold leading-tight text-white sm:text-3xl">
              {tagline || "Headline utama landing public akan tampil di sini"}
            </h3>
            <p className="mt-3 line-clamp-3 max-w-xl text-sm leading-6 text-white/75">
              {about || "Deskripsi singkat bisnis membantu customer paham value sebelum lanjut booking."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {(features.length ? features : ["Selling point pertama", "Benefit utama"]).slice(0, 4).map((feature, index) => (
                <span key={`${feature}-${index}`} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900">
                  {feature}
                </span>
              ))}
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
  value,
}: {
  label: string;
  ready: boolean;
  value?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-white/[0.03] dark:text-slate-200">
      <span className={`h-2 w-2 rounded-full ${ready ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`} />
      {label}: {value || (ready ? "Terisi" : "Belum")}
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
