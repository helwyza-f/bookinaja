"use client";

import { useState } from "react";
import { Clock, Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SectionShell, ViewGrid, ViewItem } from "./section-shell";
import type { SectionProps } from "./types";

export function OperationsSection({ profile, saving, onSave }: SectionProps) {
  const [draft, setDraft] = useState({
    open_time: profile.open_time || "09:00",
    close_time: profile.close_time || "21:00",
    timezone: profile.timezone || "Asia/Jakarta",
    primary_color: profile.primary_color || "#3b82f6",
    booking_form_config: {
      ...(profile.booking_form_config || {}),
      controller_features: {
        enable_fnb:
          profile.booking_form_config?.controller_features?.enable_fnb ?? true,
        enable_addons:
          profile.booking_form_config?.controller_features?.enable_addons ?? true,
      },
    },
  });
  const [editing, setEditing] = useState(false);

  const resetDraft = () => {
    setDraft({
      open_time: profile.open_time || "09:00",
      close_time: profile.close_time || "21:00",
      timezone: profile.timezone || "Asia/Jakarta",
      primary_color: profile.primary_color || "#3b82f6",
      booking_form_config: {
        ...(profile.booking_form_config || {}),
        controller_features: {
          enable_fnb:
            profile.booking_form_config?.controller_features?.enable_fnb ?? true,
          enable_addons:
            profile.booking_form_config?.controller_features?.enable_addons ?? true,
        },
      },
    });
  };

  return (
    <SectionShell
      title="Controller, Jam Operasional, & Brand"
      description="Atur fitur controller, jam operasional, timezone, dan warna utama tenant."
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
          <ViewItem label="Timezone" value={profile.timezone || "Asia/Jakarta"} />
          <ViewItem
            label="Warna utama"
            value={
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: profile.primary_color }} />
                {profile.primary_color}
              </span>
            }
          />
          <ViewItem
            label="Controller F&B"
            value={
              draft.booking_form_config.controller_features.enable_fnb
                ? "Aktif"
                : "Nonaktif"
            }
          />
          <ViewItem
            label="Controller add-on"
            value={
              draft.booking_form_config.controller_features.enable_addons
                ? "Aktif"
                : "Nonaktif"
            }
          />
        </ViewGrid>
      }
    >
      <div className="grid gap-4 md:grid-cols-4">
        <Field label="Jam buka">
          <Input value={draft.open_time} onChange={(event) => setDraft({ ...draft, open_time: event.target.value })} placeholder="09:00" />
        </Field>
        <Field label="Jam tutup">
          <Input value={draft.close_time} onChange={(event) => setDraft({ ...draft, close_time: event.target.value })} placeholder="21:00" />
        </Field>
        <Field label="Timezone">
          <Input value={draft.timezone} onChange={(event) => setDraft({ ...draft, timezone: event.target.value })} placeholder="Asia/Jakarta" />
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

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <ToggleRow
          title="Fitur F&B di controller"
          description="Kalau dimatikan, menu F&B tidak muncul di controller live, POS, atau history booking."
          checked={draft.booking_form_config.controller_features.enable_fnb}
          onCheckedChange={(checked) =>
            setDraft((current) => ({
              ...current,
              booking_form_config: {
                ...current.booking_form_config,
                controller_features: {
                  ...current.booking_form_config.controller_features,
                  enable_fnb: checked,
                },
              },
            }))
          }
        />
        <ToggleRow
          title="Fitur add-on di controller"
          description="Kalau dimatikan, add-on tambahan tidak bisa dipesan saat sesi berjalan dan tidak muncul di history controller."
          checked={draft.booking_form_config.controller_features.enable_addons}
          onCheckedChange={(checked) =>
            setDraft((current) => ({
              ...current,
              booking_form_config: {
                ...current.booking_form_config,
                controller_features: {
                  ...current.booking_form_config.controller_features,
                  enable_addons: checked,
                },
              },
            }))
          }
        />
      </div>
    </SectionShell>
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

function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-950 dark:text-white">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
