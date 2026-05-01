"use client";

import { useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SectionShell, ViewGrid, ViewItem } from "./section-shell";
import type { SectionProps } from "./types";

export function DiscoverySection({
  profile,
  saving,
  onSave,
}: SectionProps) {
  const [tagInput, setTagInput] = useState("");
  const [badgeInput, setBadgeInput] = useState("");
  const [draft, setDraft] = useState({
    discovery_headline: profile.discovery_headline || "",
    discovery_subheadline: profile.discovery_subheadline || "",
    promo_label: profile.promo_label || "",
    featured_image_url: profile.featured_image_url || "",
    highlight_copy: profile.highlight_copy || "",
    discovery_tags: profile.discovery_tags || [],
    discovery_badges: profile.discovery_badges || [],
    discovery_featured: profile.discovery_featured || false,
    discovery_promoted: profile.discovery_promoted || false,
    discovery_priority: profile.discovery_priority || 0,
    promo_starts_at: toDateTimeLocal(profile.promo_starts_at),
    promo_ends_at: toDateTimeLocal(profile.promo_ends_at),
  });
  const [editing, setEditing] = useState(false);

  const resetDraft = () => {
    setDraft({
      discovery_headline: profile.discovery_headline || "",
      discovery_subheadline: profile.discovery_subheadline || "",
      promo_label: profile.promo_label || "",
      featured_image_url: profile.featured_image_url || "",
      highlight_copy: profile.highlight_copy || "",
      discovery_tags: profile.discovery_tags || [],
      discovery_badges: profile.discovery_badges || [],
      discovery_featured: profile.discovery_featured || false,
      discovery_promoted: profile.discovery_promoted || false,
      discovery_priority: profile.discovery_priority || 0,
      promo_starts_at: toDateTimeLocal(profile.promo_starts_at),
      promo_ends_at: toDateTimeLocal(profile.promo_ends_at),
    });
    setTagInput("");
    setBadgeInput("");
  };

  const addListItem = (key: "discovery_tags" | "discovery_badges", value: string) => {
    const next = value.trim();
    if (!next) return;
    if (draft[key].some((item) => item.toLowerCase() === next.toLowerCase())) {
      return;
    }
    setDraft({ ...draft, [key]: [...draft[key], next] });
  };

  const removeListItem = (
    key: "discovery_tags" | "discovery_badges",
    index: number,
  ) => {
    setDraft({
      ...draft,
      [key]: draft[key].filter((_, itemIndex) => itemIndex !== index),
    });
  };

  return (
    <SectionShell
      title="Discovery & Marketplace"
      description="Kurasi bagaimana bisnis kamu tampil di feed customer, marketplace, dan rekomendasi discovery."
      icon={Sparkles}
      saving={saving}
      editing={editing}
      onEdit={() => setEditing(true)}
      onCancel={() => {
        resetDraft();
        setEditing(false);
      }}
      onSave={() => {
        onSave({
          ...draft,
          promo_starts_at: fromDateTimeLocal(draft.promo_starts_at),
          promo_ends_at: fromDateTimeLocal(draft.promo_ends_at),
        });
        setEditing(false);
      }}
      view={
        <div className="space-y-3">
          <ViewGrid>
            <ViewItem label="Discovery headline" value={profile.discovery_headline} />
            <ViewItem label="Promo label" value={profile.promo_label} />
          </ViewGrid>
          <ViewGrid>
            <ViewItem
              label="Featured"
              value={profile.discovery_featured ? "Tampil di featured bila lolos ranking" : "Normal"}
            />
            <ViewItem
              label="Promoted"
              value={profile.discovery_promoted ? "Sedang dipromosikan" : "Tidak dipromosikan"}
            />
          </ViewGrid>
          <ViewItem
            label="Priority score"
            value={String(profile.discovery_priority || 0)}
          />
          <ViewItem
            label="Subheadline discovery"
            value={profile.discovery_subheadline}
          />
          <ViewItem label="Highlight copy" value={profile.highlight_copy} />
          <ViewItem
            label="Featured image"
            value={profile.featured_image_url || "Fallback ke banner bisnis"}
          />
          <ViewGrid>
            <ViewItem
              label="Promo mulai"
              value={formatPromoWindow(profile.promo_starts_at)}
            />
            <ViewItem
              label="Promo berakhir"
              value={formatPromoWindow(profile.promo_ends_at)}
            />
          </ViewGrid>
          <TagGroup
            label="Tags discovery"
            items={profile.discovery_tags || []}
            emptyLabel="Belum ada tags discovery"
          />
          <TagGroup
            label="Badges discovery"
            items={profile.discovery_badges || []}
            emptyLabel="Belum ada badges discovery"
          />
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <ToggleField
            label="Featured feed"
            description="Beri sinyal bahwa bisnis ini layak muncul lebih tinggi di blok featured."
            checked={draft.discovery_featured}
            onCheckedChange={(checked) =>
              setDraft({ ...draft, discovery_featured: checked })
            }
          />
          <ToggleField
            label="Promoted promo"
            description="Tandai bisnis ini sedang aktif dipromosikan dengan label promo dan momentum khusus."
            checked={draft.discovery_promoted}
            onCheckedChange={(checked) =>
              setDraft({ ...draft, discovery_promoted: checked })
            }
          />
        </div>

        <Field label="Priority score">
          <Input
            type="number"
            min="0"
            step="1"
            value={draft.discovery_priority}
            onChange={(event) =>
              setDraft({
                ...draft,
                discovery_priority: Math.max(0, Number(event.target.value || 0)),
              })
            }
            placeholder="0"
          />
          <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
            Skor manual untuk mendorong urutan tampil di featured dan discovery feed. Semakin tinggi, semakin diprioritaskan.
          </p>
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Discovery headline">
            <Input
              value={draft.discovery_headline}
              onChange={(event) =>
                setDraft({ ...draft, discovery_headline: event.target.value })
              }
              placeholder="Contoh: Tempat main private yang lebih gampang dipesan"
            />
          </Field>
          <Field label="Promo label">
            <Input
              value={draft.promo_label}
              onChange={(event) =>
                setDraft({ ...draft, promo_label: event.target.value })
              }
              placeholder="Contoh: Lagi ramai"
            />
          </Field>
        </div>

        <Field label="Subheadline discovery">
          <Textarea
            value={draft.discovery_subheadline}
            onChange={(event) =>
              setDraft({
                ...draft,
                discovery_subheadline: event.target.value,
              })
            }
            className="min-h-24"
            placeholder="Jelaskan kenapa bisnis ini menarik untuk dicoba customer."
          />
        </Field>

        <Field label="Highlight copy">
          <Textarea
            value={draft.highlight_copy}
            onChange={(event) =>
              setDraft({ ...draft, highlight_copy: event.target.value })
            }
            className="min-h-24"
            placeholder="Copy pendek untuk featured reason di feed customer."
          />
        </Field>

        <Field label="Featured image URL">
          <Input
            value={draft.featured_image_url}
            onChange={(event) =>
              setDraft({ ...draft, featured_image_url: event.target.value })
            }
            placeholder="https://..."
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Promo mulai">
            <Input
              type="datetime-local"
              value={draft.promo_starts_at}
              onChange={(event) =>
                setDraft({ ...draft, promo_starts_at: event.target.value })
              }
            />
          </Field>
          <Field label="Promo berakhir">
            <Input
              type="datetime-local"
              value={draft.promo_ends_at}
              onChange={(event) =>
                setDraft({ ...draft, promo_ends_at: event.target.value })
              }
            />
          </Field>
        </div>

        <ListEditor
          label="Tags discovery"
          inputValue={tagInput}
          placeholder="Contoh: Private Room"
          items={draft.discovery_tags}
          onInputChange={setTagInput}
          onAdd={() => {
            addListItem("discovery_tags", tagInput);
            setTagInput("");
          }}
          onRemove={(index) => removeListItem("discovery_tags", index)}
        />

        <ListEditor
          label="Badges discovery"
          inputValue={badgeInput}
          placeholder="Contoh: Buka Sampai Malam"
          items={draft.discovery_badges}
          onInputChange={setBadgeInput}
          onAdd={() => {
            addListItem("discovery_badges", badgeInput);
            setBadgeInput("");
          }}
          onRemove={(index) => removeListItem("discovery_badges", index)}
        />
      </div>
    </SectionShell>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div>
        <p className="text-sm font-semibold text-slate-950 dark:text-white">{label}</p>
        <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
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

function TagGroup({
  label,
  items,
  emptyLabel,
}: {
  label: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.length ? (
          items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-white/10"
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-400">{emptyLabel}</span>
        )}
      </div>
    </div>
  );
}

function ListEditor({
  label,
  inputValue,
  placeholder,
  items,
  onInputChange,
  onAdd,
  onRemove,
}: {
  label: string;
  inputValue: string;
  placeholder: string;
  items: string[];
  onInputChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-slate-500">{label}</Label>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" onClick={onAdd} className="h-10 rounded-xl">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex min-h-10 flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/[0.03]">
        {items.length === 0 ? (
          <span className="px-2 py-1 text-sm text-slate-400">
            Belum ada item curated
          </span>
        ) : (
          items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200"
            >
              {item}
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={`Hapus ${label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function formatPromoWindow(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
