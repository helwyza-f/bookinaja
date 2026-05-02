"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2, Upload, X, Zap, ImagePlus } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Label } from "../ui/label";
import type { PostMediaMetadata } from "@/lib/discovery";
import { uploadFileInChunks } from "@/lib/chunk-upload";

interface SingleImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  endpoint?: string;
  label?: string;
  className?: string;
  aspect?: "square" | "video" | "auto"; // Fleksibilitas rasio
  onMetadataChange?: (metadata: PostMediaMetadata) => void;
}

export function SingleImageUpload({
  value,
  onChange,
  endpoint = "/admin/upload",
  label = "Upload Image",
  className,
  aspect = "square", // DEFAULT: SQUARE (1:1)
  onMetadataChange,
}: SingleImageUploadProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }

    const preparedFile = await prepareImageForUpload(file).catch(() => file);
    if (preparedFile.size > 5 * 1024 * 1024) {
      toast.error("Ukuran gambar setelah diproses masih terlalu besar (Maks 5MB)");
      return;
    }

    const formData = new FormData();
    formData.append("image", preparedFile);

    setLoading(true);
    setProgress(0);
    try {
      const metadata = await extractImageMetadata(preparedFile).catch(() => ({} as PostMediaMetadata));
      const res = await uploadFileInChunks(endpoint, preparedFile, setProgress).catch(async (err: any) => {
        if (err?.response?.status === 404 || err?.response?.status === 405) {
          const legacyRes = await api.post(endpoint, formData, {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (event) => {
              const percent = Math.round(((event.loaded ?? 0) / Math.max(preparedFile.size, 1)) * 100);
              setProgress(Math.min(100, percent));
            },
          });
          return legacyRes.data;
        }
        throw err;
      });
      onChange(res.url);
      onMetadataChange?.({
        ...metadata,
        mime_type: preparedFile.type || metadata.mime_type,
      });
      toast.success("Gambar berhasil diupload!");
    } catch (err: any) {
      toast.error(
        err?.response?.status === 413
          ? "Upload ditolak karena file masih terlalu besar untuk server"
          : "Gagal mengupload gambar",
      );
    } finally {
      setLoading(false);
      setProgress(0);
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
                  onMetadataChange?.({});
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
                  Uploading {progress}%
                </span>
                <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
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
                    Auto-Compress · Max 5MB
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

async function prepareImageForUpload(file: File) {
  const targetBytes = 950 * 1024;
  if (file.size <= targetBytes) {
    return file;
  }

  const image = await loadImage(file);
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return file;
  }
  ctx.drawImage(image, 0, 0, width, height);

  const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
  let quality = mimeType === "image/png" ? undefined : 0.82;
  let blob = await canvasToBlob(canvas, mimeType, quality);

  while (blob.size > targetBytes && mimeType !== "image/png" && quality && quality > 0.45) {
    quality = Math.max(0.45, quality - 0.08);
    blob = await canvasToBlob(canvas, mimeType, quality);
  }

  const nextName = file.name.replace(/\.(png|jpg|jpeg|webp)$/i, mimeType === "image/png" ? ".png" : ".jpg");
  return new File([blob], nextName, {
    type: blob.type || mimeType,
    lastModified: Date.now(),
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("image compression failed"));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("image metadata unavailable"));
    };
    image.src = objectUrl;
  });
}

function extractImageMetadata(file: File): Promise<PostMediaMetadata> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({
        mime_type: file.type || undefined,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("image metadata unavailable"));
    };
    image.src = objectUrl;
  });
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
