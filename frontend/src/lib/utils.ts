import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Owner bisa paste URL Google Maps polos ATAU seluruh snippet embed
 * (`<iframe src="https://www.google.com/maps/embed?...">...</iframe>`).
 * Kembalikan URL `src` yang bisa dipakai langsung sebagai `src` iframe,
 * atau string kosong kalau tidak ada yang valid.
 */
export function resolveMapEmbedSrc(value?: string | null): string {
  const raw = (value ?? "").trim()
  if (!raw) return ""

  // Bentuk snippet <iframe src="...">: ambil isi atribut src.
  if (raw.toLowerCase().includes("<iframe")) {
    const match = raw.match(/src\s*=\s*["']([^"']+)["']/i)
    return match ? match[1].trim() : ""
  }

  // Sudah berupa URL polos.
  if (/^https?:\/\//i.test(raw)) return raw

  return ""
}
