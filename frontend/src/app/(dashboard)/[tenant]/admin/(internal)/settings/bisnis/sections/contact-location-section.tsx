"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SectionShell, ViewGrid, ViewItem } from "./section-shell";
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
        <div className="space-y-3">
          <ViewItem label="Alamat" value={profile.address} />
          <ViewGrid>
            <ViewItem label="WhatsApp" value={profile.whatsapp_number} />
            <ViewItem label="Instagram" value={profile.instagram_url} />
            <ViewItem label="TikTok" value={profile.tiktok_url} />
            <ViewItem label="Map" value={profile.map_iframe_url ? "Terisi" : "-"} />
          </ViewGrid>
        </div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-slate-500">{label}</Label>
      {children}
    </div>
  );
}
