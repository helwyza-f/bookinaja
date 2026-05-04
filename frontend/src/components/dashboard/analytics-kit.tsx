"use client";

import { useId, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ToneKey = "indigo" | "emerald" | "amber" | "rose" | "cyan" | "slate";

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  change?: string;
  icon?: LucideIcon;
  tone?: ToneKey;
  loading?: boolean;
};

type PanelProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
};

type ChartPoint = {
  label: string;
  primary: number;
  secondary?: number;
  tertiary?: number;
  meta?: string;
};

type LineChartPanelProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  points: ChartPoint[];
  primaryLabel: string;
  secondaryLabel?: string;
  tertiaryLabel?: string;
  formatValue?: (value: number) => string;
  className?: string;
};

type DonutSegment = {
  label: string;
  value: number;
  colorClass: string;
};

type DonutPanelProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  totalLabel: string;
  totalValue: string;
  segments: DonutSegment[];
  footer?: ReactNode;
};

type LeaderRow = {
  id: string;
  title: string;
  subtitle?: string;
  value: string;
  meta?: string;
  progress?: number;
};

type LeaderboardPanelProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  rows: LeaderRow[];
  emptyText: string;
};

const toneMap: Record<
  ToneKey,
  {
    shell: string;
    icon: string;
    glow: string;
  }
> = {
  indigo: {
    shell:
      "border-blue-200/70 bg-[linear-gradient(180deg,rgba(239,246,255,0.98),rgba(255,255,255,0.98))] dark:border-blue-500/20 dark:bg-[linear-gradient(180deg,rgba(9,23,55,0.92),rgba(15,23,42,0.98))]",
    icon: "bg-blue-600 text-white shadow-[0_18px_35px_rgba(37,99,235,0.28)]",
    glow: "from-blue-500/15 via-cyan-500/10 to-transparent",
  },
  emerald: {
    shell:
      "border-emerald-200/70 bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(255,255,255,0.98))] dark:border-emerald-500/20 dark:bg-[linear-gradient(180deg,rgba(6,30,23,0.94),rgba(15,23,42,0.98))]",
    icon: "bg-emerald-600 text-white shadow-[0_18px_35px_rgba(5,150,105,0.28)]",
    glow: "from-emerald-500/15 via-teal-500/10 to-transparent",
  },
  amber: {
    shell:
      "border-amber-200/70 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,255,255,0.98))] dark:border-amber-500/20 dark:bg-[linear-gradient(180deg,rgba(39,25,8,0.94),rgba(15,23,42,0.98))]",
    icon: "bg-amber-500 text-white shadow-[0_18px_35px_rgba(245,158,11,0.28)]",
    glow: "from-amber-400/18 via-orange-400/10 to-transparent",
  },
  rose: {
    shell:
      "border-rose-200/70 bg-[linear-gradient(180deg,rgba(255,241,242,0.98),rgba(255,255,255,0.98))] dark:border-rose-500/20 dark:bg-[linear-gradient(180deg,rgba(50,20,28,0.94),rgba(15,23,42,0.98))]",
    icon: "bg-rose-500 text-white shadow-[0_18px_35px_rgba(244,63,94,0.26)]",
    glow: "from-rose-400/18 via-pink-400/10 to-transparent",
  },
  cyan: {
    shell:
      "border-cyan-200/70 bg-[linear-gradient(180deg,rgba(236,254,255,0.98),rgba(255,255,255,0.98))] dark:border-cyan-500/20 dark:bg-[linear-gradient(180deg,rgba(9,33,42,0.94),rgba(15,23,42,0.98))]",
    icon: "bg-cyan-500 text-white shadow-[0_18px_35px_rgba(6,182,212,0.26)]",
    glow: "from-cyan-400/18 via-sky-400/10 to-transparent",
  },
  slate: {
    shell:
      "border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,1),rgba(255,255,255,1))] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(10,10,10,0.98))]",
    icon: "bg-slate-950 text-white shadow-[0_18px_35px_rgba(15,23,42,0.22)] dark:bg-white dark:text-slate-950",
    glow: "from-slate-400/12 via-slate-300/8 to-transparent",
  },
};

export function DashboardMetricCard({
  label,
  value,
  hint,
  change,
  icon: Icon,
  tone = "slate",
  loading = false,
}: MetricCardProps) {
  const colors = toneMap[tone];

  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-[1.9rem] border p-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_60px_rgba(0,0,0,0.28)]",
        colors.shell,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br",
          colors.glow,
        )}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">
            {label}
          </div>
          <div className="text-2xl font-[950] tracking-tight text-slate-950 dark:text-white sm:text-[2rem]">
            {loading ? "..." : value}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hint ? (
              <span className="text-xs font-medium text-slate-500 dark:text-slate-300">
                {hint}
              </span>
            ) : null}
            {change ? (
              <Badge className="rounded-full border-none bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-100">
                {change}
              </Badge>
            ) : null}
          </div>
        </div>
        {Icon ? (
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.1rem]",
              colors.icon,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export function DashboardPanel({
  eyebrow,
  title,
  description,
  actions,
  className,
  children,
}: PanelProps) {
  return (
    <Card
      className={cn(
        "rounded-[2rem] border-slate-200/80 bg-white/95 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#0f1117]/96 dark:shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            {eyebrow ? (
              <div className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-500 dark:text-slate-300">
                {eyebrow}
              </div>
            ) : null}
            <div>
              <h2 className="text-xl font-[950] tracking-tight text-slate-950 dark:text-white">
                {title}
              </h2>
              {description ? (
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-300">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
        {children}
      </div>
    </Card>
  );
}

export function DashboardLineChartPanel({
  eyebrow,
  title,
  description,
  points,
  primaryLabel,
  secondaryLabel,
  tertiaryLabel,
  formatValue = defaultNumberFormatter,
  className,
}: LineChartPanelProps) {
  const gradientId = useId();
  const secondaryGradientId = useId();
  const maxValue = Math.max(
    1,
    ...points.flatMap((point) => [
      point.primary,
      point.secondary ?? 0,
      point.tertiary ?? 0,
    ]),
  );
  const width = 720;
  const height = 260;
  const paddingX = 24;
  const paddingY = 20;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  const primaryCoordinates = points.map((point, index) => {
    const x =
      paddingX +
      (points.length <= 1 ? innerWidth / 2 : (innerWidth / (points.length - 1)) * index);
    const y =
      paddingY + innerHeight - (point.primary / maxValue) * innerHeight;
    return { x, y };
  });
  const secondaryCoordinates = points.map((point, index) => {
    const x =
      paddingX +
      (points.length <= 1 ? innerWidth / 2 : (innerWidth / (points.length - 1)) * index);
    const y =
      paddingY +
      innerHeight -
      ((point.secondary ?? 0) / maxValue) * innerHeight;
    return { x, y };
  });
  const primaryLine = buildLinePath(primaryCoordinates);
  const primaryArea = buildAreaPath(primaryCoordinates, height - paddingY);
  const secondaryLine = buildLinePath(secondaryCoordinates);

  return (
    <DashboardPanel
      eyebrow={eyebrow}
      title={title}
      description={description}
      className={className}
    >
      {points.length ? (
        <>
          <div className="flex flex-wrap gap-2">
            <LegendPill tone="primary" label={primaryLabel} />
            {secondaryLabel ? (
              <LegendPill tone="secondary" label={secondaryLabel} />
            ) : null}
            {tertiaryLabel ? (
              <LegendPill tone="tertiary" label={tertiaryLabel} />
            ) : null}
          </div>
          <div className="overflow-hidden rounded-[1.7rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.9))] p-4 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-[250px] w-full">
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(37,99,235,0.26)" />
                  <stop offset="100%" stopColor="rgba(37,99,235,0)" />
                </linearGradient>
                <linearGradient
                  id={secondaryGradientId}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="rgba(16,185,129,0.28)" />
                  <stop offset="100%" stopColor="rgba(16,185,129,0)" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3].map((item) => {
                const y = paddingY + (innerHeight / 3) * item;
                return (
                  <line
                    key={item}
                    x1={paddingX}
                    y1={y}
                    x2={width - paddingX}
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-200/80 dark:text-white/8"
                    strokeDasharray="4 6"
                  />
                );
              })}
              <path d={primaryArea} fill={`url(#${gradientId})`} />
              <path
                d={primaryLine}
                fill="none"
                stroke="rgb(37 99 235)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {secondaryLabel ? (
                <path
                  d={secondaryLine}
                  fill="none"
                  stroke="rgb(16 185 129)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="8 8"
                />
              ) : null}
              {primaryCoordinates.map((point, index) => (
                <g key={`${points[index]?.label || index}-primary`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill="rgb(37 99 235)"
                    stroke="rgba(255,255,255,0.92)"
                    strokeWidth="3"
                  />
                  {secondaryLabel ? (
                    <circle
                      cx={secondaryCoordinates[index]?.x}
                      cy={secondaryCoordinates[index]?.y}
                      r="4"
                      fill="rgb(16 185 129)"
                      stroke="rgba(255,255,255,0.92)"
                      strokeWidth="2"
                    />
                  ) : null}
                </g>
              ))}
            </svg>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
              {points.map((point) => (
                <div
                  key={point.label}
                  className="rounded-[1.2rem] border border-white/80 bg-white/80 px-3 py-2.5 shadow-sm dark:border-white/6 dark:bg-white/[0.03]"
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {point.label}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                    {formatValue(point.primary)}
                  </div>
                  {secondaryLabel ? (
                    <div className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-300">
                      {formatValue(point.secondary ?? 0)}
                    </div>
                  ) : null}
                  {point.meta ? (
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {point.meta}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <EmptyPanel text="Belum ada data untuk divisualkan pada rentang ini." />
      )}
    </DashboardPanel>
  );
}

export function DashboardDonutPanel({
  eyebrow,
  title,
  description,
  totalLabel,
  totalValue,
  segments,
  footer,
}: DonutPanelProps) {
  const safeTotal = Math.max(
    segments.reduce((sum, segment) => sum + segment.value, 0),
    1,
  );
  let cursor = 0;
  const gradient = segments.length
    ? `conic-gradient(${segments
        .map((segment) => {
          const start = (cursor / safeTotal) * 360;
          cursor += segment.value;
          const end = (cursor / safeTotal) * 360;
          return `${resolveChartColor(segment.colorClass)} ${start}deg ${end}deg`;
        })
        .join(", ")})`
    : "conic-gradient(#e2e8f0 0deg 360deg)";

  return (
    <DashboardPanel
      eyebrow={eyebrow}
      title={title}
      description={description}
    >
      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
        <div className="mx-auto flex w-full max-w-[220px] items-center justify-center">
          <div
            className="relative h-44 w-44 rounded-full"
            style={{ backgroundImage: gradient }}
          >
            <div className="absolute inset-[18px] rounded-full bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:bg-[#0f1117]">
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  {totalLabel}
                </div>
                <div className="mt-2 text-2xl font-[950] tracking-tight text-slate-950 dark:text-white">
                  {totalValue}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {segments.length ? (
            segments.map((segment) => {
              const share = (segment.value / safeTotal) * 100;
              return (
                <div
                  key={segment.label}
                  className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "h-3 w-3 rounded-full",
                          mapCssColorClass(segment.colorClass),
                        )}
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-950 dark:text-white">
                          {segment.label}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {segment.value.toLocaleString("id-ID")}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-950 dark:text-white">
                        {share.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyPanel text="Belum ada distribusi data untuk ditampilkan." />
          )}
          {footer}
        </div>
      </div>
    </DashboardPanel>
  );
}

export function DashboardLeaderboardPanel({
  eyebrow,
  title,
  description,
  rows,
  emptyText,
}: LeaderboardPanelProps) {
  return (
    <DashboardPanel eyebrow={eyebrow} title={title} description={description}>
      <div className="space-y-3">
        {rows.length ? (
          rows.map((row, index) => (
            <div
              key={row.id}
              className="rounded-[1.45rem] border border-slate-200/80 bg-slate-50/75 p-4 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-slate-950 text-sm font-black text-white dark:bg-white dark:text-slate-950">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                        {row.title}
                      </div>
                      {row.subtitle ? (
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {row.subtitle}
                        </div>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold text-blue-600 dark:text-blue-300">
                        {row.value}
                      </div>
                      {row.meta ? (
                        <div className="mt-1 text-[11px] text-slate-400">
                          {row.meta}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {typeof row.progress === "number" ? (
                    <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"
                        style={{
                          width: `${Math.max(Math.min(row.progress, 100), 8)}%`,
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        ) : (
          <EmptyPanel text={emptyText} />
        )}
      </div>
    </DashboardPanel>
  );
}

export function DashboardStatStrip({
  items,
}: {
  items: Array<{ label: string; value: string; tone?: ToneKey }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className={cn(
            "rounded-[1.6rem] border px-4 py-3.5 shadow-sm",
            toneMap[item.tone || "slate"].shell,
          )}
        >
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
            {item.label}
          </div>
          <div className="mt-2 text-lg font-[950] tracking-tight text-slate-950 dark:text-white">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
      {text}
    </div>
  );
}

function LegendPill({
  label,
  tone,
}: {
  label: string;
  tone: "primary" | "secondary" | "tertiary";
}) {
  const colorClass =
    tone === "primary"
      ? "bg-blue-600"
      : tone === "secondary"
        ? "bg-emerald-500"
        : "bg-amber-400";
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200">
      <span className={cn("h-2.5 w-2.5 rounded-full", colorClass)} />
      {label}
    </div>
  );
}

function buildLinePath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function buildAreaPath(
  points: Array<{ x: number; y: number }>,
  baselineY: number,
) {
  if (!points.length) return "";
  const line = buildLinePath(points);
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  return `${line} L ${lastPoint.x} ${baselineY} L ${firstPoint.x} ${baselineY} Z`;
}

function defaultNumberFormatter(value: number) {
  return value.toLocaleString("id-ID");
}

function mapCssColorClass(token: string) {
  switch (token) {
    case "--chart-indigo":
      return "bg-blue-600";
    case "--chart-emerald":
      return "bg-emerald-500";
    case "--chart-amber":
      return "bg-amber-400";
    case "--chart-rose":
      return "bg-rose-500";
    default:
      return "bg-slate-400";
  }
}

function resolveChartColor(token: string) {
  switch (token) {
    case "--chart-indigo":
      return "rgb(37 99 235)";
    case "--chart-emerald":
      return "rgb(16 185 129)";
    case "--chart-amber":
      return "rgb(251 191 36)";
    case "--chart-rose":
      return "rgb(244 63 94)";
    default:
      return "rgb(148 163 184)";
  }
}
