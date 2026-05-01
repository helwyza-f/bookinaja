"use client";

import { useState } from "react";
import { ChevronDown, Plus, Sparkles, X } from "lucide-react";
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
      title="Tampilan di Customer Feed"
      description="Isi bagian penting yang membantu customer cepat paham dan tertarik dengan bisnis kamu."
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
            <ViewItem label="Judul singkat" value={profile.discovery_headline} />
            <ViewItem label="Label kecil" value={profile.promo_label} />
          </ViewGrid>
          <ViewItem
            label="Alasan kenapa customer harus tertarik"
            value={profile.highlight_copy || profile.discovery_subheadline}
          />
          <TagGroup
            label="Kata bantu pencarian"
            items={profile.discovery_tags || []}
            emptyLabel="Belum ada kata bantu"
          />
          <TagGroup
            label="Badge pendek"
            items={profile.discovery_badges || []}
            emptyLabel="Belum ada badge"
          />
          <details className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-slate-700">
              Pengaturan lanjutan
              <ChevronDown className="h-4 w-4" />
            </summary>
            <div className="mt-3 space-y-2 text-sm text-slate-500">
              <div>Unggulan: {profile.discovery_featured ? "Nyala" : "Normal"}</div>
              <div>Promo: {profile.discovery_promoted ? "Nyala" : "Normal"}</div>
              <div>Urutan tampil: {profile.discovery_priority || 0}</div>
            </div>
          </details>
        </div>
      }
    >
      <div className="space-y-5">
        <Field
          label="Judul singkat untuk customer"
          hint="Kalimat utama yang muncul di card atau feed. Buat singkat dan jelas."
        >
          <Input
            value={draft.discovery_headline}
            onChange={(event) =>
              setDraft({ ...draft, discovery_headline: event.target.value })
            }
            placeholder="Contoh: Tempat main private yang gampang dipesan"
          />
        </Field>

        <Field
          label="Alasan singkat kenapa layak dicoba"
          hint="Ini membantu customer cepat paham kenapa bisnis kamu menarik."
        >
          <Textarea
            value={draft.highlight_copy}
            onChange={(event) =>
              setDraft({ ...draft, highlight_copy: event.target.value })
            }
            className="min-h-24"
            placeholder="Contoh: Cocok untuk booking malam, private room, dan datang rame-rame."
          />
        </Field>

        <Field
          label="Penjelasan tambahan"
          hint="Opsional. Bisa dipakai kalau kamu ingin isi deskripsi kedua yang lebih detail."
        >
          <Textarea
            value={draft.discovery_subheadline}
            onChange={(event) =>
              setDraft({
                ...draft,
                discovery_subheadline: event.target.value,
              })
            }
            className="min-h-24"
            placeholder="Jelaskan suasana, kegunaan, atau momen terbaik untuk booking."
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Label kecil"
            hint="Contoh: Lagi ramai, Promo weekend, Baru di Bookinaja."
          >
            <Input
              value={draft.promo_label}
              onChange={(event) =>
                setDraft({ ...draft, promo_label: event.target.value })
              }
              placeholder="Contoh: Lagi ramai"
            />
          </Field>

          <Field
            label="Gambar utama"
            hint="Kalau kosong, sistem akan pakai banner bisnis yang sekarang."
          >
            <Input
              value={draft.featured_image_url}
              onChange={(event) =>
                setDraft({ ...draft, featured_image_url: event.target.value })
              }
              placeholder="https://..."
            />
          </Field>
        </div>

        <ListEditor
          label="Kata bantu pencarian"
          helper="Gunakan kata yang kemungkinan dicari customer, misalnya Private Room, Family Friendly, atau Meeting Space."
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
          label="Badge pendek"
          helper="Badge pendek akan tampil sebagai penanda cepat di card."
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

        <details className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-slate-800">
            Pengaturan lanjutan
            <ChevronDown className="h-4 w-4" />
          </summary>

          <div className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <ToggleField
                label="Tandai sebagai unggulan"
                description="Dipakai kalau kamu ingin bisnis ini lebih mudah muncul di bagian unggulan."
                checked={draft.discovery_featured}
                onCheckedChange={(checked) =>
                  setDraft({ ...draft, discovery_featured: checked })
                }
              />
              <ToggleField
                label="Tandai sedang promo"
                description="Dipakai kalau ada momentum khusus yang ingin lebih ditonjolkan."
                checked={draft.discovery_promoted}
                onCheckedChange={(checked) =>
                  setDraft({ ...draft, discovery_promoted: checked })
                }
              />
            </div>

            <Field
              label="Urutan tampil manual"
              hint="Semakin tinggi, semakin diprioritaskan untuk tampil lebih atas."
            >
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
          </div>
        </details>
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
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-950">{label}</p>
        <p className="mt-1 text-xs leading-6 text-slate-500">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-slate-600">{label}</Label>
      {hint ? <p className="text-xs leading-6 text-slate-500">{hint}</p> : null}
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
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.length ? (
          items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
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
  helper,
  inputValue,
  placeholder,
  items,
  onInputChange,
  onAdd,
  onRemove,
}: {
  label: string;
  helper?: string;
  inputValue: string;
  placeholder: string;
  items: string[];
  onInputChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-slate-600">{label}</Label>
      {helper ? <p className="text-xs leading-6 text-slate-500">{helper}</p> : null}
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
        <Button type="button" onClick={onAdd} className="h-10 rounded-xl bg-blue-600 hover:bg-blue-500">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex min-h-10 flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
        {items.length === 0 ? (
          <span className="px-2 py-1 text-sm text-slate-400">
            Belum ada item
          </span>
        ) : (
          items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
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
