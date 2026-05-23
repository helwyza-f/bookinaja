import api from "./api";
import { prepareImageForUpload } from "./image-upload-prep";

export const uploadImage = async (file: File): Promise<string> => {
  const preparedFile = await prepareImageForUpload(file, "default").catch(() => file);
  if (preparedFile.size > 5 * 1024 * 1024) {
    throw new Error("Ukuran gambar melebihi 5MB setelah diproses");
  }

  const formData = new FormData();
  formData.append("image", preparedFile);

  const res = await api.post("/admin/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data.url; // Mengembalikan URL S3 dari Go
};
