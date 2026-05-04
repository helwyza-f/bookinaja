"use client";

import { useState } from "react";
import axios from "axios";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Film, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import type { PostMediaMetadata } from "@/lib/discovery";
import { uploadFileInChunks } from "@/lib/chunk-upload";

type SingleMediaUploadProps = {
  value: string;
  onChange: (url: string) => void;
  endpoint?: string;
  label?: string;
  className?: string;
  aspect?: "square" | "video" | "auto";
  accept?: string;
  mediaKind?: "image" | "video";
  maxSizeMb?: number;
  onMetadataChange?: (metadata: PostMediaMetadata) => void;
};

export function SingleMediaUpload({
  value,
  onChange,
  endpoint = "/admin/upload-media",
  label = "Upload Media",
  className,
  aspect = "video",
  accept = "image/*,video/mp4,video/webm,video/quicktime",
  mediaKind = "image",
  maxSizeMb = 60,
  onMetadataChange,
}: SingleMediaUploadProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preparedFile =
      file.type.startsWith("image/") ? await prepareImageForUpload(file).catch(() => file) : file;

    if (preparedFile.size > maxSizeMb * 1024 * 1024) {
      toast.error(`File terlalu besar (Maks ${maxSizeMb}MB)`);
      return;
    }

    const formData = new FormData();
    formData.append("file", preparedFile);

    setLoading(true);
    setProgress(0);
    try {
      const metadata = await extractMediaMetadata(preparedFile).catch(() => ({} as PostMediaMetadata));
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
      toast.success(mediaKind === "video" ? "Video berhasil diupload" : "Media berhasil diupload");
    } catch (error: unknown) {
      toast.error(
        getAxiosStatus(error) === 413
          ? "Upload ditolak karena file masih terlalu besar untuk server"
          : "Gagal mengupload media",
      );
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const isVideo = mediaKind === "video";

  return (
    <div className={cn("space-y-3 w-full", className)}>
      {label ? (
        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1 leading-none">
          {label}
        </Label>
      ) : null}

      <div
        className={cn(
          "relative group w-full rounded-[2rem] bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center transition-all hover:border-blue-500/50 hover:bg-slate-100/50",
          aspect === "square" && "aspect-square",
          aspect === "video" && "aspect-video",
          !value && "cursor-pointer",
        )}
      >
        {value ? (
          <>
            {isVideo ? (
              <video
                src={value}
                poster={undefined}
                className="w-full h-full object-cover"
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="Preview" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px] flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="rounded-2xl h-12 w-12 shadow-2xl transition-transform hover:scale-110 active:scale-95"
                onClick={(event) => {
                  event.preventDefault();
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
                  accept={accept}
                  onChange={handleUpload}
                  disabled={loading}
                />
              </label>
            </div>
          </>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-full space-y-4 cursor-pointer py-10">
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
                <div className="h-16 w-16 rounded-[1.5rem] bg-white shadow-xl flex items-center justify-center text-slate-300 group-hover:text-blue-600 group-hover:scale-110 transition-all duration-500">
                  {isVideo ? <Film className="h-8 w-8" strokeWidth={1.5} /> : <ImagePlus className="h-8 w-8" strokeWidth={1.5} />}
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-[1000] uppercase italic tracking-tighter text-slate-900 leading-none">
                    {isVideo ? "Drop Video Here" : "Drop Media Here"}
                  </p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-2 leading-none">
                    Max Size: {maxSizeMb}MB
                  </p>
                  {isVideo ? (
                    <p className="mt-2 text-[9px] font-semibold text-slate-400">
                      Gunakan MP4 atau WebM pendek agar playback tetap ringan.
                    </p>
                  ) : null}
                </div>
              </div>
            )}
            <input
              type="file"
              className="hidden"
              accept={accept}
              onChange={handleUpload}
              disabled={loading}
            />
          </label>
        )}
      </div>
    </div>
  );
}

async function extractMediaMetadata(file: File): Promise<PostMediaMetadata> {
  const mime_type = file.type || undefined;
  if (mime_type?.startsWith("image/")) {
    const image = await loadImage(file);
    return {
      mime_type,
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  }

  if (mime_type?.startsWith("video/")) {
    const video = await loadVideo(file);
    return {
      mime_type,
      width: Math.round(video.videoWidth || 0),
      height: Math.round(video.videoHeight || 0),
      duration_seconds: Number.isFinite(video.duration) ? Math.round(video.duration) : undefined,
    };
  }

  return { mime_type };
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

function getAxiosStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
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

function loadVideo(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(video);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("video metadata unavailable"));
    };
    video.src = objectUrl;
  });
}
