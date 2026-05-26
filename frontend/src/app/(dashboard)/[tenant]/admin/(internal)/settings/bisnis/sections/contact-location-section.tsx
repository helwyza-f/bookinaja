"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SectionShell } from "./section-shell";
import type { SectionProps } from "./types";

export function ContactLocationSection({ profile, saving, onSave }: SectionProps) {
  const [draft, setDraft] = useState({
    address: profile.address || "",
    whatsapp_number: profile.whatsapp_number || "",
    instagram_url: profile.instagram_url || "",
    tiktok_url: profile.tiktok_url || "",
    map_iframe_url: profile.map_iframe_url || "",
  });
  const [editing, setEditing] = useState(false);

  const resetDraft = () => {
    setDraft({
      address: profile.address || "",
      whatsapp_number: profile.whatsapp_number || "",
      instagram_url: profile.instagram_url || "",
      tiktok_url: profile.tiktok_url || "",
      map_iframe_url: profile.map_iframe_url || "",
    });
  };

  return (
    <SectionShell
      title="Kontak & Lokasi"
      description="Alamat, WhatsApp, social link, dan map embed yang tampil di landing."
      icon={MapPin}
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
        <ContactPreview
          address={profile.address}
          whatsapp={profile.whatsapp_number}
          instagram={profile.instagram_url}
          tiktok={profile.tiktok_url}
          mapUrl={profile.map_iframe_url}
        />
      }
    >
      <div className="space-y-4">
        <Field label="Alamat">
          <Textarea value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="WhatsApp">
            <Input value={draft.whatsapp_number} onChange={(event) => setDraft({ ...draft, whatsapp_number: event.target.value })} />
          </Field>
          <Field label="Instagram URL">
            <Input value={draft.instagram_url} onChange={(event) => setDraft({ ...draft, instagram_url: event.target.value })} />
          </Field>
          <Field label="TikTok URL">
            <Input value={draft.tiktok_url} onChange={(event) => setDraft({ ...draft, tiktok_url: event.target.value })} />
          </Field>
          <Field label="Google Maps / iframe URL">
            <Input value={draft.map_iframe_url} onChange={(event) => setDraft({ ...draft, map_iframe_url: event.target.value })} />
          </Field>
        </div>
      </div>
    </SectionShell>
  );
}

function ContactPreview({
  address,
  whatsapp,
  instagram,
  tiktok,
  mapUrl,
}: {
  address?: string;
  whatsapp?: string;
  instagram?: string;
  tiktok?: string;
  mapUrl?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <PreviewChip label="Alamat" ready={Boolean(address)} />
        <PreviewChip label="WhatsApp" ready={Boolean(whatsapp)} />
        <PreviewChip label="Social" ready={Boolean(instagram || tiktok)} />
        <PreviewChip label="Map" ready={Boolean(mapUrl)} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-white/[0.03]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Lokasi bisnis
          </p>
          <p className="mt-3 text-base font-semibold leading-7 text-slate-950 dark:text-white">
            {address || "Alamat belum diisi"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800">
              WA {whatsapp || "belum diisi"}
            </span>
            {instagram ? (
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800">
                Instagram
              </span>
            ) : null}
            {tiktok ? (
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800">
                TikTok
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-[150px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center dark:border-slate-800 dark:bg-white/[0.03]">
          <div>
            <MapPin className="mx-auto h-6 w-6 text-[var(--bookinaja-600)]" />
            <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
              {mapUrl ? "Map terpasang" : "Map belum ada"}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Preview map akan tampil di landing public
            </p>
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
      <Label className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">{label}</Label>
      {children}
    </div>
  );
}
