"use client";

import {
  ExternalLink,
  Monitor,
  RefreshCw,
  RotateCcw,
  Save,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StudioHeaderProps = {
  hasUnpublishedChanges: boolean;
  previewSource: "draft" | "live";
  previewUrl?: string;
  saving?: boolean;
  lastPublishedLabel?: string;
  onRefresh: () => void;
  onPublish: () => void;
  onResetDraft: () => void;
};

export function PageBuilderStudioHeader({
  hasUnpublishedChanges,
  previewSource,
  previewUrl,
  saving = false,
  lastPublishedLabel,
  onRefresh,
  onPublish,
  onResetDraft,
}: StudioHeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff,rgba(248,250,252,0.96))] p-5 shadow-[0_22px_60px_rgba(15,23,42,0.08)] dark:border-white/12 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(8,12,24,0.98))] dark:shadow-[0_22px_60px_rgba(2,6,23,0.42)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.05),transparent_30%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.2),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.04),transparent_24%)]" />
      <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--bookinaja-200)] bg-[var(--bookinaja-50)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--bookinaja-700)] shadow-sm dark:border-[rgba(96,165,250,0.24)] dark:bg-[rgba(59,130,246,0.14)] dark:text-[var(--bookinaja-100)]">
            <Sparkles className="h-3.5 w-3.5" />
            Landing Page Studio
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              Kelola landing page dalam satu editor
            </h1>
            {lastPublishedLabel ? <StatusPill tone="neutral" label={`Published ${lastPublishedLabel}`} compact /> : null}
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
            Edit draft, cek preview, lalu publish saat tampilannya sudah siap.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusPill
              tone={hasUnpublishedChanges ? "warning" : "success"}
              label={hasUnpublishedChanges ? "Draft belum publish" : "Draft sinkron"}
            />
            <StatusPill
              tone="neutral"
              label={previewSource === "draft" ? "Preview: draft" : "Preview: live"}
            />
          </div>
        </div>

        <div className="xl:min-w-[22rem] xl:max-w-[24rem]">
          <div className="rounded-[1.45rem] border border-slate-200/80 bg-white/88 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  Publish
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  {hasUnpublishedChanges ? "Draft siap dipublish" : "Belum ada perubahan"}
                </div>
              </div>
              <Button
                type="button"
                onClick={onPublish}
                disabled={saving}
                className="h-11 rounded-2xl bg-[var(--bookinaja-600)] px-4 text-white shadow-[0_12px_30px_rgba(37,99,235,0.28)] hover:bg-[var(--bookinaja-700)] disabled:border disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:opacity-100 dark:shadow-[0_16px_34px_rgba(29,78,216,0.3)] dark:disabled:border-white/10 dark:disabled:bg-white/[0.08] dark:disabled:text-slate-500"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Publishing..." : "Publish"}
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {previewUrl ? (
                <Button asChild variant="outline" className="h-10 rounded-2xl border-slate-200 bg-slate-50/90 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:bg-white/[0.08]">
                  <a href={previewUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Publik
                  </a>
                </Button>
              ) : (
                <Button type="button" variant="outline" disabled className="h-10 rounded-2xl">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Publik
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onRefresh} className="h-10 rounded-2xl border-slate-200 bg-slate-50/90 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:bg-white/[0.08]">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onResetDraft}
                className="h-10 rounded-2xl border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:bg-amber-500/15"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type PreviewToolbarProps = {
  activeCount: number;
  previewMode: "desktop" | "mobile";
  previewSource: "draft" | "live";
  selectedSectionLabel?: string;
  hasUnpublishedChanges: boolean;
  onPreviewSourceChange: (value: "draft" | "live") => void;
  onPreviewModeChange: (value: "desktop" | "mobile") => void;
};

export function PageBuilderPreviewToolbar({
  activeCount,
  previewMode,
  previewSource,
  selectedSectionLabel,
  hasUnpublishedChanges,
  onPreviewSourceChange,
  onPreviewModeChange,
}: PreviewToolbarProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200/90 bg-slate-50/70 px-5 py-4 dark:border-white/10 dark:bg-white/[0.02] lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
          Live Preview
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
          <span>{activeCount} section aktif</span>
          {selectedSectionLabel ? <span>• {selectedSectionLabel}</span> : null}
          {hasUnpublishedChanges ? <span className="font-medium text-amber-600 dark:text-amber-300">• Draft berubah</span> : null}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <SegmentedControl
          label="Source"
          items={[
            { value: "draft", label: "Draft" },
            { value: "live", label: "Live" },
          ]}
          value={previewSource}
          onChange={(value) => onPreviewSourceChange(value as "draft" | "live")}
        />
        <SegmentedControl
          label="Viewport"
          items={[
            { value: "desktop", label: "Desktop", icon: <Monitor className="h-4 w-4" /> },
            { value: "mobile", label: "Mobile", icon: <Smartphone className="h-4 w-4" /> },
          ]}
          value={previewMode}
          onChange={(value) => onPreviewModeChange(value as "desktop" | "mobile")}
        />
      </div>
    </div>
  );
}

function StatusPill({
  tone,
  label,
  compact = false,
}: {
  tone: "success" | "warning" | "neutral";
  label: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm",
        compact && "px-2.5 py-1 text-[11px]",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
        tone === "neutral" && "border-slate-200 bg-white/90 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300",
      )}
    >
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          compact && "h-2 w-2",
          tone === "success" && "bg-emerald-500",
          tone === "warning" && "bg-amber-500",
          tone === "neutral" && "bg-slate-400",
        )}
      />
      {label}
    </div>
  );
}

function SegmentedControl({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex flex-col gap-1.5">
      <div className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
              value === item.value
                ? "bg-slate-950 text-white shadow-sm dark:bg-[var(--bookinaja-600)] dark:text-white"
                : "text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.06]",
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
