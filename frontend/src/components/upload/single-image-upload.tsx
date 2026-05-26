"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { Loader2, Upload, ImagePlus } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Label } from "../ui/label";
import type { PostMediaMetadata } from "@/lib/discovery";
import { uploadFileInChunks } from "@/lib/chunk-upload";
import {
  prepareImageForUpload,
  type ImageUploadPreset,
} from "@/lib/image-upload-prep";

interface SingleImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  endpoint?: string;
  label?: string;
  emptyTitle?: string;
  emptyHint?: string;
  className?: string;
  aspect?: "square" | "video" | "auto"; // Fleksibilitas rasio
  uploadPreset?: ImageUploadPreset;
  onMetadataChange?: (metadata: PostMediaMetadata) => void;
}

export function SingleImageUpload({
  value,
  onChange,
  endpoint = "/admin/upload",
  label = "Upload Image",
  emptyTitle = "Upload gambar",
  emptyHint = "PNG/JPG • maks 5MB",
  className,
  aspect = "square", // DEFAULT: SQUARE (1:1)
  uploadPreset = "default",
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

    const preparedFile = await prepareImageForUpload(file, uploadPreset).catch(() => file);
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
      const res = await uploadFileInChunks(endpoint, preparedFile, setProgress).catch(async (error: unknown) => {
        const status = getAxiosStatus(error);
        if (status === 404 || status === 405) {
          const legacyRes = await api.post(endpoint, formData, {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (event) => {
              const percent = Math.round(((event.loaded ?? 0) / Math.max(preparedFile.size, 1)) * 100);
              setProgress(Math.min(100, percent));
            },
          });
          return legacyRes.data;
        }
        throw error;
      });
      onChange(res.url);
      onMetadataChange?.({
        ...metadata,
        mime_type: preparedFile.type || metadata.mime_type,
      });
      toast.success("Gambar berhasil diupload!");
    } catch (error: unknown) {
      toast.error(
        getAxiosStatus(error) === 413
          ? "Upload ditolak karena file masih terlalu besar untuk server"
          : "Gagal mengupload gambar",
      );
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className={cn("w-full space-y-3", className)}>
      {label && (
        <Label className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          {label}
        </Label>
      )}

      <div
        className={cn(
          "group relative flex w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 transition-all hover:border-[var(--bookinaja-300)] hover:bg-slate-50 dark:border-slate-800 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]",
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
              className="h-full w-full object-cover animate-in fade-in duration-500"
            />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-950/50 opacity-0 transition-all duration-200 backdrop-blur-[2px] group-hover:opacity-100">
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="h-10 w-10 rounded-xl shadow-xl transition-transform hover:scale-105 active:scale-95"
                onClick={(e) => {
                  e.preventDefault();
                  onChange("");
                  onMetadataChange?.({});
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-[var(--bookinaja-600)] text-white shadow-xl transition-transform hover:scale-105 active:scale-95">
                <Upload className="h-4 w-4" />
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
          <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center px-6 py-8 text-center">
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--bookinaja-600)]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--bookinaja-700)]">
                  Uploading {progress}%
                </span>
                <div className="h-2 w-36 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-[var(--bookinaja-600)] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-200 transition-all duration-200 group-hover:text-[var(--bookinaja-600)] dark:bg-slate-900 dark:ring-slate-700">
                  <ImagePlus className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {emptyTitle}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {emptyHint}
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

function getAxiosStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
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
