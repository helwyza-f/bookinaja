// src/components/upload/bulk-image-upload.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, X, Image as ImageIcon, LayoutGrid } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("images", file);
    });

    setLoading(true);
    try {
      const res = await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newUrls = [...values, ...res.data.urls];
      onChange(newUrls);
      toast.success(`${res.data.urls.length} foto berhasil ditambahkan!`);
    } catch (err) {
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
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-slate-400 italic flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-blue-600" /> Photo Gallery Detail
        </h3>
        <span className="text-[9px] font-bold text-slate-400 uppercase italic">
          {values.length} Photos
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {values.map((url, index) => (
          <div
            key={index}
            className="relative aspect-square rounded-[1.5rem] overflow-hidden group border-2 border-slate-100 dark:border-slate-800"
          >
            <img
              src={url}
              alt="Gallery"
              className="w-full h-full object-cover transition-transform group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => removeImage(url)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {/* Upload Trigger Square */}
        <label
          className={cn(
            "aspect-square rounded-[1.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-blue-500/50",
            loading && "opacity-50 pointer-events-none",
          )}
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          ) : (
            <>
              <Plus className="h-6 w-6 text-slate-300" />
              <span className="text-[8px] font-black uppercase italic text-slate-400 mt-1">
                Add Photo
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
