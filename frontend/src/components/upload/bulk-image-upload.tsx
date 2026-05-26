// src/components/upload/bulk-image-upload.tsx
"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, X, LayoutGrid } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { prepareImageForUpload } from "@/lib/image-upload-prep";

interface BulkImageUploadProps {
  values: string[];
  onChange: (urls: string[]) => void;
  endpoint?: string; // e.g., "/resources-all/upload-gallery"
}

export function BulkImageUpload({
  values = [],
  onChange,
  endpoint = "/resources-all/upload-gallery",
}: BulkImageUploadProps) {
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    try {
      const formData = new FormData();
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const preparedFile = await prepareImageForUpload(file, "media").catch(() => file);
        if (preparedFile.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} masih lebih dari 5MB setelah diproses`);
          continue;
        }
        formData.append("images", preparedFile);
      }

      if (!formData.has("images")) {
        toast.error("Tidak ada gambar yang siap diupload");
        return;
      }

      const res = await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newUrls = [...values, ...res.data.urls];
      onChange(newUrls);
      toast.success(`${res.data.urls.length} foto berhasil ditambahkan!`);
    } catch {
      toast.error("Gagal upload gallery");
    } finally {
      setLoading(false);
    }
  };

  const removeImage = (urlToRemove: string) => {
    onChange(values.filter((url) => url !== urlToRemove));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          <LayoutGrid className="h-4 w-4 text-[var(--bookinaja-600)]" /> Photo gallery
        </h3>
        <span className="text-[11px] text-slate-400">
          {values.length} foto
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {values.map((url, index) => (
          <div
            key={index}
            className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-white/[0.03]"
          >
            <img
              src={url}
              alt="Gallery"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="h-8 w-8 rounded-xl"
                onClick={() => removeImage(url)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        <label
          className={cn(
            "flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 transition-all hover:border-[var(--bookinaja-300)] hover:bg-slate-50 dark:border-slate-800 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]",
            loading && "opacity-50 pointer-events-none",
          )}
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-[var(--bookinaja-600)]" />
          ) : (
            <>
              <Plus className="h-6 w-6 text-slate-400" />
              <span className="mt-2 text-xs font-medium text-slate-500">
                Tambah foto
              </span>
            </>
          )}
          <input
            type="file"
            multiple
            className="hidden"
            accept="image/*"
            onChange={handleUpload}
            disabled={loading}
          />
        </label>
      </div>
    </div>
  );
}
