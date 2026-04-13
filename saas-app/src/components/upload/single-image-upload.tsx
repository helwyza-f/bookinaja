"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2, Upload, X, Zap, ImagePlus } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Label } from "../ui/label";

interface SingleImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  endpoint?: string;
  label?: string;
  className?: string;
  aspect?: "square" | "video" | "auto"; // Fleksibilitas rasio
}

export function SingleImageUpload({
  value,
  onChange,
  endpoint = "/admin/upload",
  label = "Upload Image",
  className,
  aspect = "square", // DEFAULT: SQUARE (1:1)
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
    <div className={cn("space-y-3 w-full", className)}>
      {label && (
        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 italic px-1 leading-none">
          {label}
        </Label>
      )}

      <div
        className={cn(
          "relative group w-full rounded-[2.5rem] bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center transition-all hover:border-blue-500/50 hover:bg-slate-100/50 dark:hover:bg-slate-800/50",
          aspect === "square" && "aspect-square",
          aspect === "video" && "aspect-video",
          !value && "cursor-pointer",
        )}
      >
        {value ? (
          <>
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover animate-in fade-in duration-500"
            />
            {/* Overlay Action */}
            <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px] flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="rounded-2xl h-12 w-12 shadow-2xl transition-transform hover:scale-110 active:scale-95"
                onClick={(e) => {
                  e.preventDefault();
                  onChange("");
                }}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
              <label className="cursor-pointer h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-2xl transition-transform hover:scale-110 active:scale-95">
                <Upload className="h-5 w-5" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleUpload}
                  disabled={loading}
                />
              </label>
            </div>
          </>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-full space-y-4 cursor-pointer">
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <span className="text-[10px] font-black uppercase text-blue-600 animate-pulse">
                  Uploading...
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-[1.5rem] bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center text-slate-300 dark:text-slate-600 group-hover:text-blue-600 group-hover:scale-110 transition-all duration-500">
                  <ImagePlus className="h-8 w-8" strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-[1000] uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none">
                    Drop Image Here
                  </p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-2 leading-none">
                    Max Size: 2MB
                  </p>
                </div>
              </div>
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

// Tambahkan icon Trash2 biar gak error
const Trash2 = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" x2="10" y1="11" y2="17" />
    <line x1="14" x2="14" y1="11" y2="17" />
  </svg>
);
