"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2, Upload, X, Zap } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Label } from "../ui/label";

interface SingleImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  endpoint?: string; // e.g., "/admin/upload" or "/resources-all/upload-cover"
  label?: string;
  className?: string;
}

export function SingleImageUpload({
  value,
  onChange,
  endpoint = "/admin/upload",
  label = "Upload Image",
  className,
}: SingleImageUploadProps) {
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi Ukuran (Max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File terlalu besar (Maks 2MB)");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    setLoading(true);
    try {
      const res = await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(res.data.url);
      toast.success("Gambar berhasil diupload!");
    } catch (err) {
      toast.error("Gagal mengupload gambar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic px-1">
        {label}
      </Label>

      <div className="relative group aspect-video w-full rounded-[2rem] bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center transition-all hover:border-blue-500/50">
        {value ? (
          <>
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="rounded-full h-10 w-10 p-0"
                onClick={() => onChange("")}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </>
        ) : (
          <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full space-y-2">
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            ) : (
              <>
                <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                  <Upload className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-black uppercase italic text-slate-400">
                  Click to Upload
                </span>
              </>
            )}
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleUpload}
              disabled={loading}
            />
          </label>
        )}
      </div>
    </div>
  );
}
