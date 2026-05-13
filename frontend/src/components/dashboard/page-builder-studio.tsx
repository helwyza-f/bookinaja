"use client";

import type { ReactNode } from "react";
import {
  ExternalLink,
  Monitor,
  RefreshCw,
  RotateCcw,
  Save,
  Smartphone,
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
    <section className="overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm dark:border-white/12 dark:bg-[#0f0f17] sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
              Page Builder
            </h1>
            {lastPublishedLabel ? (
              <StatusPill
                tone="neutral"
                label={`Published ${lastPublishedLabel}`}
                compact
              />
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              tone={hasUnpublishedChanges ? "warning" : "success"}
              label={hasUnpublishedChanges ? "Draft berubah" : "Sinkron"}
            />
            <StatusPill
              tone="neutral"
              label={previewSource === "draft" ? "Preview: draft" : "Preview: live"}
            />
          </div>
        </div>

        <div className="xl:min-w-[24rem] xl:max-w-[26rem]">
          <div className="rounded-[1.4rem] border border-slate-200/90 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  Publish
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {hasUnpublishedChanges ? "Siap publish" : "Belum ada perubahan"}
                </div>
              </div>
              <Button
                type="button"
                onClick={onPublish}
                disabled={saving}
                className="h-10 rounded-xl bg-[var(--bookinaja-600)] px-4 text-white hover:bg-[var(--bookinaja-700)] disabled:border disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-100 dark:disabled:border-white/10 dark:disabled:bg-white/[0.08] dark:disabled:text-slate-500"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Publishing..." : "Publish"}
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {previewUrl ? (
                <Button
                  asChild
                  variant="outline"
                  className="h-10 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:bg-white/[0.08]"
                >
                  <a href={previewUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Publik
                  </a>
                </Button>
              ) : (
                <Button type="button" variant="outline" disabled className="h-10 rounded-xl">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Publik
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={onRefresh}
                className="h-10 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:bg-white/[0.08]"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onResetDraft}
                className="h-10 rounded-xl border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:bg-amber-500/15"
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
    <div className="flex flex-col gap-4 border-b border-slate-200/90 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-white/[0.02] lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
          Preview
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
          <span>{activeCount} section aktif</span>
          {selectedSectionLabel ? <span>| {selectedSectionLabel}</span> : null}
          {hasUnpublishedChanges ? (
            <span className="font-medium text-amber-600 dark:text-amber-300">
              | Draft berubah
            </span>
          ) : null}
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
        "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-medium",
        compact && "px-2 py-1 text-[11px]",
        tone === "success" &&
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200",
        tone === "warning" &&
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
        tone === "neutral" &&
          "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300",
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
  items: Array<{ value: string; label: string; icon?: ReactNode }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex flex-col gap-1.5">
      <div className="px-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/[0.04]">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              value === item.value
                ? "bg-slate-950 text-white dark:bg-[var(--bookinaja-600)] dark:text-white"
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
