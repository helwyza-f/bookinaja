// Custom next/image loader that routes our Cloudflare-hosted assets through
// Cloudflare Image Transformations (`/cdn-cgi/image/...`) so resize + AVIF/WebP
// happen at the edge instead of on the Node server (VPS). This keeps the app
// server free of image-optimization CPU and gives a globally cached, redeploy-safe
// derivative cache.
//
// Wired only when NEXT_PUBLIC_CF_IMAGES=1 (see next.config.ts). It REQUIRES the
// "Transformations" feature to be enabled on the Cloudflare zone that serves the
// CDN hosts below — until that is on, leave the flag unset so the built-in
// Next.js optimizer stays in charge (no regression).
//
// Sources that are not on our CDN (Unsplash, local /public assets, data/blob
// URIs) pass through untouched.

const CDN_HOSTS = new Set(["cdn.bookinaja.com", "cdn-test.bookinaja.com"]);

type LoaderArgs = {
  src: string;
  width: number;
  quality?: number;
};

export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: LoaderArgs): string {
  // Relative paths, data: and blob: URIs — nothing to rewrite.
  if (!/^https?:\/\//i.test(src)) return src;

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }

  // Only transform assets we actually host on Cloudflare.
  if (!CDN_HOSTS.has(url.hostname)) return src;

  // Never double-wrap an already-transformed URL.
  if (url.pathname.startsWith("/cdn-cgi/image/")) return src;

  const params = [
    `width=${width}`,
    `quality=${quality || 75}`,
    "format=auto", // AVIF/WebP negotiated per Accept header
    "fit=scale-down", // never upscale beyond the source
  ];

  return `${url.origin}/cdn-cgi/image/${params.join(",")}${url.pathname}`;
}
