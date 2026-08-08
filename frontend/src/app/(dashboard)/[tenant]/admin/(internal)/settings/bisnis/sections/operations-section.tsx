"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Palette, UtensilsCrossed, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionShell } from "./section-shell";
import type { SectionProps } from "./types";

export function OperationsSection({ profile, saving, onSave }: SectionProps) {
  const [draft, setDraft] = useState({
    open_time: profile.open_time || "09:00",
    close_time: profile.close_time || "21:00",
    timezone: profile.timezone || "Asia/Jakarta",
    primary_color: profile.primary_color || "#3b82f6",
    // Pertahankan config (fnb_mode & controller_features) apa adanya — dikelola
    // di Settings → Mode F&B, jangan sampai tertimpa saat simpan bagian ini.
    booking_form_config: {
      ...(profile.booking_form_config || {}),
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
      },
    });
  };

  return (
    <SectionShell
      title="Jam Operasional & Brand"
      description="Atur jam operasional, timezone, dan warna utama tenant."
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
        <OperationsPreview
          openTime={profile.open_time}
          closeTime={profile.close_time}
          timezone={profile.timezone}
          primaryColor={profile.primary_color}
        />
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

      <Link
        href="/admin/settings/menu"
        className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 transition-colors hover:border-blue-300 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-blue-500/40"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
            <UtensilsCrossed className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-white">Fitur F&B &amp; add-on</p>
            <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Pengaturan menu (nyatu / terpisah / off) &amp; add-on sekarang ada di halaman khusus.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-blue-600 dark:text-blue-300">
          Mode F&B
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </Link>
    </SectionShell>
  );
}

function OperationsPreview({
  openTime,
  closeTime,
  timezone,
  primaryColor,
}: {
  openTime?: string;
  closeTime?: string;
  timezone?: string;
  primaryColor?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <PreviewChip label="Jam" ready={Boolean(openTime && closeTime)} />
        <PreviewChip label="Timezone" ready={Boolean(timezone)} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Jam operasional
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
              {openTime || "09:00"} - {closeTime || "21:00"}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {timezone || "Asia/Jakarta"}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
            <span className="h-9 w-9 rounded-lg" style={{ backgroundColor: primaryColor || "#3b82f6" }} />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Warna utama</p>
              <p className="font-mono text-sm font-semibold text-slate-950 dark:text-white">
                {primaryColor || "#3b82f6"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full w-2/3 rounded-full" style={{ backgroundColor: primaryColor || "#3b82f6" }} />
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Buka</span>
          <span>Booking aktif</span>
          <span>Tutup</span>
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
      <Label className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">{label}</Label>
      {children}
    </div>
  );
}

