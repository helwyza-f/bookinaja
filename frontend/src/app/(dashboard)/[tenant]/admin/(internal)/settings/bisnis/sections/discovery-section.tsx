"use client";

import { useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SingleImageUpload } from "@/components/upload/single-image-upload";
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
      description="Tenant cukup isi materi yang ingin ditampilkan. Sistem Bookinaja yang akan mengatur ranking dan penempatan feed secara otomatis."
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
          <ViewItem
            label="Gambar utama"
            value={profile.featured_image_url ? "Sudah diupload" : "Pakai banner bisnis"}
          />
        </div>
      }
    >
      <div className="space-y-5">
        <Field
          label="Judul singkat untuk customer"
          hint="Kalimat utama yang muncul di card atau feed. Buat singkat, jelas, dan enak dibaca di mobile."
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
          hint="Ini membantu customer cepat paham kenapa bisnis kamu menarik tanpa harus buka detail dulu."
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
          hint="Opsional. Dipakai kalau kamu ingin menambah penjelasan kedua yang lebih santai atau lebih detail."
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
            hint="Label pendek yang muncul di card. Misalnya: Lagi ramai, Private room, Baru gabung."
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
            hint="Gambar ini akan dipakai untuk feed customer. Kalau kosong, sistem akan pakai banner bisnis."
          >
            <SingleImageUpload
              label=""
              value={draft.featured_image_url}
              onChange={(url) =>
                setDraft({ ...draft, featured_image_url: url })
              }
              aspect="video"
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

        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-4 text-sm leading-7 text-slate-600">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">
            Diatur otomatis oleh Bookinaja
          </div>
          <div className="mt-2 space-y-1">
            <p>Urutan tampil di feed</p>
            <p>Momentum promo dan kapan listing didorong</p>
            <p>Apakah listing masuk blok unggulan atau tidak</p>
          </div>
        </div>
      </div>
    </SectionShell>
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
