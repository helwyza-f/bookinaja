"use client";

import { useState } from "react";
import { Images } from "lucide-react";
import { SingleImageUpload } from "@/components/upload/single-image-upload";
import { BulkImageUpload } from "@/components/upload/bulk-image-upload";
import { SectionShell, ViewItem } from "./section-shell";
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
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <ViewItem label="Logo" value={profile.logo_url ? "Terpasang" : "-"} />
            <ViewItem label="Banner" value={profile.banner_url ? "Terpasang" : "-"} />
            <ViewItem label="Gallery" value={`${profile.gallery?.length || 0} foto`} />
          </div>
          {(profile.logo_url || profile.banner_url) ? (
            <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-white/[0.03]">
                {profile.logo_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={profile.logo_url} alt="Logo bisnis" className="aspect-square h-full w-full object-cover" />
                ) : (
                  <div className="flex aspect-square items-center justify-center text-sm text-slate-400">Logo belum ada</div>
                )}
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-white/[0.03]">
                {profile.banner_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={profile.banner_url} alt="Banner bisnis" className="aspect-[16/7] h-full w-full object-cover" />
                ) : (
                  <div className="flex aspect-[16/7] items-center justify-center text-sm text-slate-400">Banner belum ada</div>
                )}
              </div>
            </div>
          ) : null}
          {profile.gallery?.length ? (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {profile.gallery.slice(0, 4).map((url, index) => (
                <div key={`${url}-${index}`} className="aspect-square overflow-hidden rounded-xl bg-slate-100 dark:bg-white/[0.04]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </div>
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
            emptyHint="Square • PNG/JPG • maks 5MB"
          />
          <SingleImageUpload
            label="Banner / hero"
            value={draft.banner_url}
            onChange={(url) => setDraft({ ...draft, banner_url: url })}
            aspect="video"
            uploadPreset="hero"
            emptyTitle="Upload banner hero"
            emptyHint="Landscape • PNG/JPG • maks 5MB"
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
