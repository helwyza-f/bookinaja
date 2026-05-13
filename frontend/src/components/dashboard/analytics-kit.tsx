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
  }
> = {
  indigo: {
    shell: "border-border bg-card",
    icon: "bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[rgba(74,141,255,0.12)] dark:text-[var(--bookinaja-200)]",
  },
  emerald: {
    shell: "border-border bg-card",
    icon: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-200",
  },
  amber: {
    shell: "border-border bg-card",
    icon: "bg-amber-50 text-amber-700 dark:bg-amber-500/12 dark:text-amber-200",
  },
  rose: {
    shell: "border-border bg-card",
    icon: "bg-rose-50 text-rose-700 dark:bg-rose-500/12 dark:text-rose-200",
  },
  cyan: {
    shell: "border-border bg-card",
    icon: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/12 dark:text-cyan-200",
  },
  slate: {
    shell: "border-border bg-card",
    icon: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200",
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
        "rounded-xl border p-3 sm:p-3.5",
        colors.shell,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
            {label}
          </div>
          <div className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            {loading ? "..." : value}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hint ? (
              <span className="text-muted-foreground hidden text-[11px] xl:inline">
                {hint}
              </span>
            ) : null}
            {change ? (
              <Badge className="bg-muted text-muted-foreground rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase">
                {change}
              </Badge>
            ) : null}
          </div>
        </div>
        {Icon ? (
          <div
            className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", colors.icon)}
          >
            <Icon className="h-4 w-4" />
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
        "rounded-xl border border-border bg-card p-4 sm:p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            {eyebrow ? (
              <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
                {eyebrow}
              </div>
            ) : null}
            <div>
              <h2 className="text-foreground text-base font-semibold sm:text-lg">
                {title}
              </h2>
              {description ? (
                <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-6">
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
          <div className="bg-muted/40 overflow-hidden rounded-lg border border-border p-3">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-[210px] w-full">
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(37,99,235,0.16)" />
                  <stop offset="100%" stopColor="rgba(37,99,235,0)" />
                </linearGradient>
                <linearGradient
                  id={secondaryGradientId}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="rgba(16,185,129,0.16)" />
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
                strokeWidth="3"
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
                <g key={`${points[index]?.label || "point"}-${index}-primary`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="rgb(37 99 235)"
                    stroke="rgba(255,255,255,0.92)"
                    strokeWidth="3"
                  />
                  {secondaryLabel ? (
                    <circle
                      cx={secondaryCoordinates[index]?.x}
                      cy={secondaryCoordinates[index]?.y}
                      r="3"
                      fill="rgb(16 185 129)"
                      stroke="rgba(255,255,255,0.92)"
                      strokeWidth="2"
                    />
                  ) : null}
                </g>
              ))}
            </svg>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
              {points.map((point, index) => (
                <div
                  key={`${point.label}-${index}`}
                    className="rounded-lg border border-border bg-card px-2.5 py-2"
                >
                  <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                    {point.label}
                  </div>
                  <div className="text-foreground mt-1 text-sm font-medium">
                    {formatValue(point.primary)}
                  </div>
                  {secondaryLabel ? (
                    <div className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-300">
                      {formatValue(point.secondary ?? 0)}
                    </div>
                  ) : null}
                  {point.meta ? (
                    <div className="text-muted-foreground mt-1 text-[11px]">
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
            className="relative h-36 w-36 rounded-full"
            style={{ backgroundImage: gradient }}
          >
            <div className="bg-card absolute inset-[16px] rounded-full">
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                  {totalLabel}
                </div>
                <div className="text-foreground mt-2 text-xl font-semibold tracking-tight">
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
                <div key={segment.label} className="bg-muted/40 rounded-lg border border-border px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "h-3 w-3 rounded-full",
                          mapCssColorClass(segment.colorClass),
                        )}
                      />
                      <div>
                        <div className="text-foreground text-sm font-medium">
                          {segment.label}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {segment.value.toLocaleString("id-ID")}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-foreground text-sm font-medium">
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
              className="bg-muted/40 rounded-lg border border-border p-3"
            >
              <div className="flex items-start gap-3">
                <div className="bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-foreground truncate text-sm font-medium">
                        {row.title}
                      </div>
                      {row.subtitle ? (
                        <div className="text-muted-foreground mt-1 text-xs">
                          {row.subtitle}
                        </div>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-medium text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
                        {row.value}
                      </div>
                      {row.meta ? (
                        <div className="text-muted-foreground mt-1 text-[11px]">
                          {row.meta}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {typeof row.progress === "number" ? (
                    <div className="bg-muted mt-3 h-2 rounded-full">
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
            "rounded-lg border px-3 py-2.5",
            toneMap[item.tone || "slate"].shell,
          )}
        >
          <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
            {item.label}
          </div>
          <div className="text-foreground mt-1.5 text-base font-semibold tracking-tight">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="bg-muted/30 text-muted-foreground rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm">
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
    <div className="bg-card text-muted-foreground inline-flex items-center gap-2 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium">
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
