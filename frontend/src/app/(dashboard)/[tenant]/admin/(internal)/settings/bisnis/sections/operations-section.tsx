"use client";

import { useState } from "react";
import { Clock, Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionShell, ViewGrid, ViewItem } from "./section-shell";
import type { SectionProps } from "./types";

export function OperationsSection({ profile, saving, onSave }: SectionProps) {
  const [draft, setDraft] = useState({
    open_time: profile.open_time || "09:00",
    close_time: profile.close_time || "21:00",
    primary_color: profile.primary_color || "#3b82f6",
  });
  const [editing, setEditing] = useState(false);

  const resetDraft = () => {
    setDraft({
      open_time: profile.open_time || "09:00",
      close_time: profile.close_time || "21:00",
      primary_color: profile.primary_color || "#3b82f6",
    });
  };

  return (
    <SectionShell
      title="Operasional & Brand Token"
      description="Jam tampil di landing dan warna utama public page."
      icon={Clock}
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
          <ViewItem label="Jam buka" value={profile.open_time} />
          <ViewItem label="Jam tutup" value={profile.close_time} />
          <ViewItem
            label="Warna utama"
            value={
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: profile.primary_color }} />
                {profile.primary_color}
              </span>
            }
          />
        </ViewGrid>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Jam buka">
          <Input value={draft.open_time} onChange={(event) => setDraft({ ...draft, open_time: event.target.value })} placeholder="09:00" />
        </Field>
        <Field label="Jam tutup">
          <Input value={draft.close_time} onChange={(event) => setDraft({ ...draft, close_time: event.target.value })} placeholder="21:00" />
        </Field>
        <Field label="Warna utama">
          <div className="flex gap-2">
            <Input
              value={draft.primary_color}
              onChange={(event) => setDraft({ ...draft, primary_color: event.target.value })}
              className="font-mono"
            />
            <label className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 dark:border-white/10">
              <input
                type="color"
                value={draft.primary_color}
                onChange={(event) => setDraft({ ...draft, primary_color: event.target.value })}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <span className="h-6 w-6 rounded-lg" style={{ backgroundColor: draft.primary_color }} />
              <Palette className="absolute h-3 w-3 text-white" />
            </label>
          </div>
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
