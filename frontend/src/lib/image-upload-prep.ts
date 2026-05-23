export type ImageUploadPreset = "default" | "hero" | "media" | "logo" | "qris" | "thumbnail";

type ImageUploadConfig = {
  targetBytes: number;
  maxDimension: number;
  initialQuality: number;
  minQuality: number;
  qualityStep: number;
  preservePng: boolean;
  outputMimeType?: "image/webp" | "image/jpeg";
};

const IMAGE_UPLOAD_CONFIGS: Record<ImageUploadPreset, ImageUploadConfig> = {
  default: {
    targetBytes: 1.2 * 1024 * 1024,
    maxDimension: 2200,
    initialQuality: 0.86,
    minQuality: 0.72,
    qualityStep: 0.04,
    preservePng: false,
    outputMimeType: "image/webp",
  },
  hero: {
    targetBytes: 2.2 * 1024 * 1024,
    maxDimension: 2880,
    initialQuality: 0.94,
    minQuality: 0.84,
    qualityStep: 0.03,
    preservePng: false,
    outputMimeType: "image/webp",
  },
  media: {
    targetBytes: 1.6 * 1024 * 1024,
    maxDimension: 2400,
    initialQuality: 0.88,
    minQuality: 0.76,
    qualityStep: 0.04,
    preservePng: false,
    outputMimeType: "image/webp",
  },
  logo: {
    targetBytes: 420 * 1024,
    maxDimension: 900,
    initialQuality: 0.9,
    minQuality: 0.78,
    qualityStep: 0.04,
    preservePng: false,
    outputMimeType: "image/webp",
  },
  qris: {
    targetBytes: 2.5 * 1024 * 1024,
    maxDimension: 2200,
    initialQuality: 0.92,
    minQuality: 0.74,
    qualityStep: 0.05,
    preservePng: true,
  },
  thumbnail: {
    targetBytes: 520 * 1024,
    maxDimension: 1200,
    initialQuality: 0.84,
    minQuality: 0.7,
    qualityStep: 0.04,
    preservePng: false,
    outputMimeType: "image/webp",
  },
};

export async function prepareImageForUpload(
  file: File,
  preset: ImageUploadPreset = "default",
) {
  const config = IMAGE_UPLOAD_CONFIGS[preset] || IMAGE_UPLOAD_CONFIGS.default;
  if (file.type === "image/gif") {
    return file;
  }

  const image = await loadImage(file);
  const scale = Math.min(1, config.maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(image, 0, 0, width, height);

  const mimeType = getPreparedMimeType(file.type, config);
  let quality = mimeType === "image/png" ? undefined : config.initialQuality;
  let blob = await canvasToBlob(canvas, mimeType, quality);

  while (blob.size > config.targetBytes && mimeType !== "image/png" && quality && quality > config.minQuality) {
    quality = Math.max(config.minQuality, quality - config.qualityStep);
    blob = await canvasToBlob(canvas, mimeType, quality);
  }

  return new File([blob], withMimeExtension(file.name, mimeType), {
    type: blob.type || mimeType,
    lastModified: Date.now(),
  });
}

function getPreparedMimeType(fileType: string, config: ImageUploadConfig) {
  if (config.outputMimeType) return config.outputMimeType;
  if (fileType === "image/png" && config.preservePng) return "image/png";
  if (fileType === "image/webp") return "image/webp";
  if (fileType === "image/png") return "image/webp";
  return "image/jpeg";
}

function withMimeExtension(fileName: string, mimeType: string) {
  const extension = mimeType === "image/webp" ? "webp" : mimeType === "image/png" ? "png" : "jpg";
  return fileName.replace(/\.[^.]+$/, `.${extension}`);
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
