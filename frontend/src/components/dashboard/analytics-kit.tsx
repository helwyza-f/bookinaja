"use client";

import { useId, useState, type ReactNode } from "react";
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
  compact?: boolean;
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
    <Card className={cn("rounded-xl border p-3 sm:p-3.5", colors.shell)}>
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
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              colors.icon,
            )}
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
  compact = false,
  className,
  children,
}: PanelProps) {
  return (
    <Card
      className={cn(
        "rounded-xl border border-border bg-card",
        compact ? "p-3 sm:p-3.5" : "p-4 sm:p-4",
        className,
      )}
    >
      <div className={cn("flex flex-col", compact ? "gap-3" : "gap-4")}>
        <div
          className={cn(
            "flex flex-col sm:flex-row sm:justify-between",
            compact ? "gap-2 sm:items-center" : "gap-3 sm:items-start",
          )}
        >
          <div className={cn(compact ? "space-y-1" : "space-y-2")}>
            {eyebrow ? (
              <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
                {eyebrow}
              </div>
            ) : null}
            <div>
              <h2
                className={cn(
                  "text-foreground font-semibold",
                  compact ? "text-[1.05rem]" : "text-base sm:text-lg",
                )}
              >
                {title}
              </h2>
              {description ? (
                <p
                  className={cn(
                    "text-muted-foreground mt-1 max-w-2xl text-sm",
                    compact ? "leading-5" : "leading-6",
                  )}
                >
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const maxValue = Math.max(
    0,
    ...points.flatMap((point) => [
      point.primary,
      point.secondary ?? 0,
      point.tertiary ?? 0,
    ]),
  );
  const width = 760;
  const height = 272;
  const paddingLeft = 56;
  const paddingRight = 18;
  const paddingTop = 18;
  const paddingBottom = 32;
  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;
  const yTicks = buildYAxisTicks(maxValue);
  const domainMax = yTicks[yTicks.length - 1] ?? 1;
  const fallbackActiveIndex = Math.max(
    points.findLastIndex(
      (point) =>
        point.primary > 0 ||
        (point.secondary ?? 0) > 0 ||
        (point.tertiary ?? 0) > 0,
    ),
    0,
  );
  const activeIndex = hoveredIndex ?? fallbackActiveIndex;
  const baselineY = height - paddingBottom;
  const primaryActiveCount = points.filter((point) => point.primary > 0).length;
  const secondaryActiveCount = points.filter((point) => (point.secondary ?? 0) > 0).length;
  const tertiaryActiveCount = points.filter((point) => (point.tertiary ?? 0) > 0).length;
  const showPrimaryAsBars = primaryActiveCount > 0 && primaryActiveCount <= Math.max(2, Math.ceil(points.length * 0.2));
  const barWidth = Math.max(5, Math.min(18, innerWidth / Math.max(points.length * 2.4, 1)));
  const labelEvery = points.length <= 10 ? 1 : points.length <= 18 ? 2 : Math.ceil(points.length / 8);

  const primaryCoordinates = buildChartCoordinates({
    points,
    valueKey: "primary",
    width: innerWidth,
    height: innerHeight,
    paddingLeft,
    paddingTop,
    domainMax,
  });
  const secondaryCoordinates = buildChartCoordinates({
    points,
    valueKey: "secondary",
    width: innerWidth,
    height: innerHeight,
    paddingLeft,
    paddingTop,
    domainMax,
  });
  const tertiaryCoordinates = buildChartCoordinates({
    points,
    valueKey: "tertiary",
    width: innerWidth,
    height: innerHeight,
    paddingLeft,
    paddingTop,
    domainMax,
  });
  const primaryLine = buildLinePath(primaryCoordinates);
  const primaryArea = buildAreaPath(primaryCoordinates, baselineY);
  const secondaryLine = buildLinePath(secondaryCoordinates);
  const tertiaryLine = buildLinePath(tertiaryCoordinates);
  const activePoint = points[activeIndex];
  const activePrimary = primaryCoordinates[activeIndex];
  return (
    <DashboardPanel
      eyebrow={eyebrow}
      title={title}
      description={description}
      className={className}
    >
      {points.length ? (
        <>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3 shadow-inner dark:border-white/10 dark:from-white/[0.04] dark:to-transparent sm:p-4">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <LegendPill tone="primary" label={primaryLabel} />
                {secondaryLabel ? (
                  <LegendPill tone="secondary" label={secondaryLabel} />
                ) : null}
                {tertiaryLabel ? (
                  <LegendPill tone="tertiary" label={tertiaryLabel} />
                ) : null}
              </div>
              {activePoint ? (
                <div className="bg-card/80 min-w-[180px] rounded-lg border border-border px-3 py-2 backdrop-blur-sm sm:text-right">
                  <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-[0.22em]">
                    {activePoint.label}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm sm:justify-end">
                    <span className="font-medium text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
                      {formatValue(activePoint.primary)}
                    </span>
                    {secondaryLabel ? (
                      <span className="font-medium text-emerald-600 dark:text-emerald-300">
                        {formatValue(activePoint.secondary ?? 0)}
                      </span>
                    ) : null}
                    {tertiaryLabel ? (
                      <span className="font-medium text-amber-600 dark:text-amber-300">
                        {formatValue(activePoint.tertiary ?? 0)}
                      </span>
                    ) : null}
                  </div>
                  {activePoint.meta ? (
                    <div className="text-muted-foreground mt-1 text-[11px]">
                      {activePoint.meta}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-[220px] w-full"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(37,99,235,0.16)" />
                  <stop offset="100%" stopColor="rgba(37,99,235,0)" />
                </linearGradient>
              </defs>
              {yTicks.map((tick) => {
                const y = resolveChartY(
                  tick,
                  domainMax,
                  paddingTop,
                  innerHeight,
                );
                return (
                  <g key={tick}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={width - paddingRight}
                      y2={y}
                      stroke="currentColor"
                      className="text-slate-200/80 dark:text-white/8"
                      strokeDasharray="4 6"
                    />
                    <text
                      x={paddingLeft - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-400 text-[10px] font-medium dark:fill-slate-500"
                    >
                      {formatAxisTick(tick, formatValue)}
                    </text>
                  </g>
                );
              })}
              {points.map((point, index) => {
                const x = primaryCoordinates[index]?.x ?? paddingLeft;
                const showLabel =
                  index === 0 ||
                  index === points.length - 1 ||
                  index === activeIndex ||
                  index % labelEvery === 0;
                const bandStart =
                  index === 0
                    ? paddingLeft
                    : (primaryCoordinates[index - 1]?.x + x) / 2;
                const bandEnd =
                  index === points.length - 1
                    ? width - paddingRight
                    : (x + (primaryCoordinates[index + 1]?.x ?? x)) / 2;
                return (
                  <g key={`${point.label}-${index}-axis`}>
                    <rect
                      x={bandStart}
                      y={paddingTop}
                      width={Math.max(bandEnd - bandStart, 24)}
                      height={innerHeight}
                      fill="transparent"
                      onClick={() => setHoveredIndex(index)}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseMove={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onTouchStart={() => setHoveredIndex(index)}
                    />
                    {showLabel ? (
                      <text
                        x={x}
                        y={height - 10}
                        textAnchor="middle"
                        className={cn(
                          "text-[10px] font-medium uppercase tracking-wide",
                          activeIndex === index
                            ? "fill-slate-900 dark:fill-white"
                            : "fill-slate-400 dark:fill-slate-500",
                        )}
                      >
                        {point.label}
                      </text>
                    ) : null}
                  </g>
                );
              })}
              {activePrimary && hoveredIndex !== null ? (
                <line
                  x1={activePrimary.x}
                  y1={paddingTop}
                  x2={activePrimary.x}
                  y2={height - paddingBottom}
                  stroke="currentColor"
                  className="text-slate-300/70 dark:text-white/12"
                  strokeDasharray="3 6"
                />
              ) : null}
              {showPrimaryAsBars
                ? primaryCoordinates.map((point, index) => {
                    const value = points[index]?.primary ?? 0;
                    if (value <= 0) return null;
                    return (
                      <rect
                        key={`${points[index]?.label || "point"}-${index}-bar`}
                        x={point.x - barWidth / 2}
                        y={point.y}
                        width={barWidth}
                        height={Math.max(baselineY - point.y, 2)}
                        rx={Math.min(barWidth / 2, 5)}
                        fill="rgb(37 99 235)"
                        opacity={activeIndex === index ? "0.95" : "0.62"}
                      />
                    );
                  })
                : (
                  <>
                    <path d={primaryArea} fill={`url(#${gradientId})`} />
                    <path
                      d={primaryLine}
                      fill="none"
                      stroke="rgb(37 99 235)"
                      strokeWidth="2.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}
              {secondaryLabel && (secondaryActiveCount > 0 || hoveredIndex !== null) ? (
                <path
                  d={secondaryLine}
                  fill="none"
                  stroke="rgb(16 185 129)"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
              {tertiaryLabel && (tertiaryActiveCount > 0 || hoveredIndex !== null) ? (
                <path
                  d={tertiaryLine}
                  fill="none"
                  stroke="rgb(245 158 11)"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="7 7"
                />
              ) : null}
              {primaryCoordinates.map((point, index) => (
                <g key={`${points[index]?.label || "point"}-${index}-primary`}>
                  {(!showPrimaryAsBars || activeIndex === index) && (points[index]?.primary > 0 || activeIndex === index) ? (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={activeIndex === index ? "5" : "3.5"}
                      fill="rgb(37 99 235)"
                      stroke="rgba(255,255,255,0.92)"
                      strokeWidth={activeIndex === index ? "3.5" : "2.5"}
                    />
                  ) : null}
                  {secondaryLabel && ((points[index]?.secondary ?? 0) > 0 || hoveredIndex === index) ? (
                    <circle
                      cx={secondaryCoordinates[index]?.x}
                      cy={secondaryCoordinates[index]?.y}
                      r={activeIndex === index ? "4" : "3"}
                      fill="rgb(16 185 129)"
                      stroke="rgba(255,255,255,0.92)"
                      strokeWidth="2"
                    />
                  ) : null}
                  {tertiaryLabel && ((points[index]?.tertiary ?? 0) > 0 || hoveredIndex === index) ? (
                    <circle
                      cx={tertiaryCoordinates[index]?.x}
                      cy={tertiaryCoordinates[index]?.y}
                      r={activeIndex === index ? "4" : "3"}
                      fill="rgb(245 158 11)"
                      stroke="rgba(255,255,255,0.92)"
                      strokeWidth="2"
                    />
                  ) : null}
                </g>
              ))}
              {activePrimary && activePoint && hoveredIndex !== null ? (
                <g>
                  <rect
                    x={Math.min(
                      Math.max(activePrimary.x - 72, paddingLeft + 8),
                      width - paddingRight - 152,
                    )}
                    y={Math.max(activePrimary.y - 58, paddingTop + 8)}
                    width="152"
                    height={activePoint.meta ? "44" : "34"}
                    rx="10"
                    fill="rgba(15, 23, 42, 0.92)"
                    stroke="rgba(148, 163, 184, 0.22)"
                  />
                  <text
                    x={Math.min(
                      Math.max(activePrimary.x - 60, paddingLeft + 20),
                      width - paddingRight - 140,
                    )}
                    y={Math.max(activePrimary.y - 38, paddingTop + 28)}
                    className="fill-white text-[10px] font-semibold uppercase tracking-[0.2em]"
                  >
                    {activePoint.label}
                  </text>
                  <text
                    x={Math.min(
                      Math.max(activePrimary.x - 60, paddingLeft + 20),
                      width - paddingRight - 140,
                    )}
                    y={Math.max(activePrimary.y - 20, paddingTop + 46)}
                    className="fill-white text-[12px] font-semibold"
                  >
                    {formatValue(activePoint.primary)}
                  </text>
                  {activePoint.meta ? (
                    <text
                      x={Math.min(
                        Math.max(activePrimary.x - 60, paddingLeft + 20),
                        width - paddingRight - 140,
                      )}
                      y={Math.max(activePrimary.y - 6, paddingTop + 60)}
                      className="fill-slate-300 text-[10px]"
                    >
                      {activePoint.meta}
                    </text>
                  ) : null}
                </g>
              ) : null}
            </svg>
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
    <DashboardPanel eyebrow={eyebrow} title={title} description={description}>
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
                <div
                  key={segment.label}
                  className="bg-muted/40 rounded-lg border border-border px-3 py-2.5"
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

function buildChartCoordinates({
  points,
  valueKey,
  width,
  height,
  paddingLeft,
  paddingTop,
  domainMax,
}: {
  points: ChartPoint[];
  valueKey: "primary" | "secondary" | "tertiary";
  width: number;
  height: number;
  paddingLeft: number;
  paddingTop: number;
  domainMax: number;
}) {
  return points.map((point, index) => {
    const rawValue = point[valueKey] ?? 0;
    const x =
      paddingLeft +
      (points.length <= 1 ? width / 2 : (width / (points.length - 1)) * index);
    const y = resolveChartY(rawValue, domainMax, paddingTop, height);
    return { x, y };
  });
}

function resolveChartY(
  value: number,
  domainMax: number,
  paddingTop: number,
  innerHeight: number,
) {
  const safeDomain = domainMax <= 0 ? 1 : domainMax;
  return paddingTop + innerHeight - (value / safeDomain) * innerHeight;
}

function buildYAxisTicks(maxValue: number) {
  if (maxValue <= 0) {
    return [0];
  }

  const roughStep = maxValue / 4;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(roughStep, 1)));
  const residual = roughStep / magnitude;
  const niceStep =
    residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  const step = niceStep * magnitude;
  const maxTick = Math.ceil(maxValue / step) * step;

  return Array.from(
    { length: Math.max(Math.round(maxTick / step), 1) + 1 },
    (_, index) => index * step,
  );
}

function formatAxisTick(value: number, formatValue: (value: number) => string) {
  if (value === 0) return "0";
  return formatValue(value);
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
