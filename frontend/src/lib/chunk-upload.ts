import api from "@/lib/api";

type LegacyChunkInitResponse = {
  upload_id: string;
  chunk_size: number;
  total_chunks: number;
};

type DirectSingleInitResponse = {
  mode: "single";
  upload_url: string;
  url: string;
  object_key: string;
  headers?: Record<string, string>;
};

type DirectMultipartInitResponse = {
  mode: "multipart";
  upload_id: string;
  part_size: number;
  total_parts: number;
  url: string;
};

type DirectInitResponse = DirectSingleInitResponse | DirectMultipartInitResponse;

type ChunkCompleteResponse = {
  url: string;
  mime_type?: string;
  size?: number;
};

export async function uploadFileInChunks(
  endpointBase: string,
  file: File,
  onProgress?: (percent: number) => void,
) {
  try {
    return await uploadFileDirectToStorage(endpointBase, file, onProgress);
  } catch (error: any) {
    if (shouldFallbackToLegacy(error)) {
      return uploadFileViaBackendChunks(endpointBase, file, onProgress);
    }
    throw error;
  }
}

async function uploadFileDirectToStorage(
  endpointBase: string,
  file: File,
  onProgress?: (percent: number) => void,
) {
  const initRes = await api.post<DirectInitResponse>(`${endpointBase}/direct/initiate`, {
    file_name: file.name,
    content_type: file.type,
    total_size: file.size,
  });

  const init = initRes.data;
  if (init.mode === "single") {
    await uploadBlobToSignedUrl(file, init.upload_url, init.headers, false, (percent) => {
      onProgress?.(percent);
    });
    onProgress?.(100);
    return { url: init.url, mime_type: file.type, size: file.size };
  }

  const completedParts: Array<{ part_number: number; etag: string }> = [];
  const totalParts = init.total_parts;
  const partSize = init.part_size;
  let completedBytes = 0;

  for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
    const start = (partNumber - 1) * partSize;
    const end = Math.min(file.size, start + partSize);
    const blob = file.slice(start, end);
    const urlRes = await api.get<{ upload_url: string }>(
      `${endpointBase}/direct/${init.upload_id}/part-url`,
      { params: { part_number: partNumber } },
    );
    const etag = await uploadBlobToSignedUrl(blob, urlRes.data.upload_url, undefined, true, (partPercent) => {
      const percent = Math.min(
        99,
        Math.round(((completedBytes + blob.size * (partPercent / 100)) / Math.max(file.size, 1)) * 100),
      );
      onProgress?.(percent);
    });
    completedBytes += blob.size;
    completedParts.push({ part_number: partNumber, etag });
    onProgress?.(Math.min(99, Math.round((completedBytes / Math.max(file.size, 1)) * 100)));
  }

  const completeRes = await api.post<ChunkCompleteResponse>(
    `${endpointBase}/direct/${init.upload_id}/complete`,
    { parts: completedParts },
  );
  onProgress?.(100);
  return completeRes.data;
}

async function uploadFileViaBackendChunks(
  endpointBase: string,
  file: File,
  onProgress?: (percent: number) => void,
) {
  const initRes = await api.post<LegacyChunkInitResponse>(`${endpointBase}/chunk/initiate`, {
    file_name: file.name,
    content_type: file.type,
    total_size: file.size,
  });

  const { upload_id: uploadId, chunk_size: chunkSize, total_chunks: totalChunks } = initRes.data;
  let completedBytes = 0;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const start = chunkIndex * chunkSize;
    const end = Math.min(file.size, start + chunkSize);
    const blob = file.slice(start, end);
    const formData = new FormData();
    formData.append("chunk", blob, `${file.name}.part-${chunkIndex}`);
    formData.append("chunk_index", String(chunkIndex));

    await api.post(`${endpointBase}/chunk/${uploadId}/part`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        const loaded = Math.min(blob.size, event.loaded ?? 0);
        const percent = Math.min(
          99,
          Math.round(((completedBytes + loaded) / Math.max(file.size, 1)) * 100),
        );
        onProgress?.(percent);
      },
    });

    completedBytes += blob.size;
    onProgress?.(Math.min(99, Math.round((completedBytes / Math.max(file.size, 1)) * 100)));
  }

  const completeRes = await api.post<ChunkCompleteResponse>(`${endpointBase}/chunk/${uploadId}/complete`);
  onProgress?.(100);
  return completeRes.data;
}

function uploadBlobToSignedUrl(
  blob: Blob,
  uploadURL: string,
  headers?: Record<string, string>,
  requireEtag?: boolean,
  onProgress?: (percent: number) => void,
) {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadURL, true);

    Object.entries(headers || {}).forEach(([key, value]) => {
      if (value) {
        xhr.setRequestHeader(key, value);
      }
    });

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.round((event.loaded / Math.max(event.total, 1)) * 100);
      onProgress?.(Math.min(100, percent));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag") || xhr.getResponseHeader("etag") || "";
        if (requireEtag && !etag.trim()) {
          reject(new Error("missing etag or cors expose header"));
          return;
        }
        resolve(etag.replace(/^"+|"+$/g, ""));
        return;
      }
      reject(new Error(`upload failed with status ${xhr.status}`));
    };

    xhr.onerror = () => reject(new Error("upload failed"));
    xhr.send(blob);
  });
}

function shouldFallbackToLegacy(error: any) {
  if (error?.response?.status === 404 || error?.response?.status === 405) {
    return true;
  }
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("network error") ||
    message.includes("failed to fetch") ||
    message.includes("upload failed") ||
    message.includes("cors") ||
    message.includes("missing etag")
  );
}
