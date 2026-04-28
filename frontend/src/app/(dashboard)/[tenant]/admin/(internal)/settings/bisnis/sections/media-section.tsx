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
          {profile.gallery?.length ? (
            <div className="grid grid-cols-4 gap-2">
              {profile.gallery.slice(0, 4).map((url, index) => (
                <div key={`${url}-${index}`} className="aspect-square overflow-hidden rounded-xl bg-slate-100">
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
        <div className="grid gap-4 md:grid-cols-2">
          <SingleImageUpload
            label="Logo bisnis"
            value={draft.logo_url}
            onChange={(url) => setDraft({ ...draft, logo_url: url })}
            aspect="square"
          />
          <SingleImageUpload
            label="Banner / hero"
            value={draft.banner_url}
            onChange={(url) => setDraft({ ...draft, banner_url: url })}
            aspect="video"
          />
        </div>
        <BulkImageUpload
          values={draft.gallery}
          onChange={(gallery) => setDraft({ ...draft, gallery })}
        />
      </div>
    </SectionShell>
  );
}
