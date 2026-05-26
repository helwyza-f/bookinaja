"use client";

import { useState } from "react";
import { Images } from "lucide-react";
import { SingleImageUpload } from "@/components/upload/single-image-upload";
import { BulkImageUpload } from "@/components/upload/bulk-image-upload";
import { SectionShell } from "./section-shell";
import type { SectionProps } from "./types";

export function MediaSection({ profile, saving, onSave }: SectionProps) {
  const [draft, setDraft] = useState({
    logo_url: profile.logo_url || "",
    banner_url: profile.banner_url || "",
    gallery: profile.gallery || [],
  });
  const [editing, setEditing] = useState(false);

  const resetDraft = () => {
    setDraft({
      logo_url: profile.logo_url || "",
      banner_url: profile.banner_url || "",
      gallery: profile.gallery || [],
    });
  };

  return (
    <SectionShell
      title="Media & Gallery"
      description="Logo, banner hero, dan foto gallery public landing."
      icon={Images}
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
        <MediaView
          logoUrl={profile.logo_url}
          bannerUrl={profile.banner_url}
          gallery={profile.gallery || []}
          businessName={profile.name}
        />
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-white/[0.03] dark:text-slate-300">
          Urutan visual yang paling terasa: <span className="font-semibold text-slate-950 dark:text-white">banner hero</span>, lalu <span className="font-semibold text-slate-950 dark:text-white">logo</span>, baru foto gallery detail.
        </div>

        <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
          <SingleImageUpload
            label="Logo bisnis"
            value={draft.logo_url}
            onChange={(url) => setDraft({ ...draft, logo_url: url })}
            aspect="square"
            uploadPreset="logo"
            emptyTitle="Upload logo"
            emptyHint="Square - PNG/JPG - maks 5MB"
          />
          <SingleImageUpload
            label="Banner / hero"
            value={draft.banner_url}
            onChange={(url) => setDraft({ ...draft, banner_url: url })}
            aspect="video"
            uploadPreset="hero"
            emptyTitle="Upload banner hero"
            emptyHint="Landscape - PNG/JPG - maks 5MB"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="mb-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Gallery detail
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Tambahkan foto pendukung setelah hero utama sudah rapi.
            </p>
          </div>
          <BulkImageUpload
            values={draft.gallery}
            onChange={(gallery) => setDraft({ ...draft, gallery })}
          />
        </div>
      </div>
    </SectionShell>
  );
}

function MediaView({
  logoUrl,
  bannerUrl,
  gallery,
  businessName,
}: {
  logoUrl?: string;
  bannerUrl?: string;
  gallery: string[];
  businessName?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <MediaChip label="Logo" ready={Boolean(logoUrl)} />
        <MediaChip label="Banner" ready={Boolean(bannerUrl)} />
        <MediaChip label="Gallery" ready={gallery.length > 0} value={`${gallery.length} foto`} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-white/[0.03]">
        <div className="relative h-[220px] bg-slate-100 dark:bg-slate-900 sm:h-[280px] lg:h-[340px]">
          {bannerUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bannerUrl}
                alt="Banner bisnis"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent" />
            </>
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-400">
              Banner belum terpasang
            </div>
          )}

          <div className="absolute inset-x-4 bottom-4 flex items-end gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white shadow-lg dark:bg-slate-950">
              {logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={logoUrl}
                  alt="Logo bisnis"
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <span className="text-lg font-semibold text-slate-400">
                  {(businessName || "B").trim().charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 pb-1">
              <p className="truncate text-base font-semibold text-white">
                {businessName || "Preview halaman publik"}
              </p>
              <p className="mt-1 text-xs font-medium text-white/75">Landing publik</p>
            </div>
          </div>
        </div>
      </div>

      {gallery.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {gallery.slice(0, 4).map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-white/[0.04]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MediaChip({
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
      <span
        className={`h-2 w-2 rounded-full ${
          ready ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
        }`}
      />
      {label}: {value || (ready ? "Terpasang" : "Belum ada")}
    </span>
  );
}
