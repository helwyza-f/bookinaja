import type { NextConfig } from "next";

// When NEXT_PUBLIC_CF_IMAGES=1, image resize + AVIF/WebP are delegated to
// Cloudflare Image Transformations at the edge (see src/lib/cloudflare-image-loader.ts).
// Requires "Transformations" enabled on the Cloudflare zone. Unset/0 keeps the
// built-in Next.js optimizer (default, no infra dependency).
const useCloudflareImages = process.env.NEXT_PUBLIC_CF_IMAGES === "1";

const imagesConfig: NextConfig["images"] = useCloudflareImages
  ? {
      loader: "custom",
      loaderFile: "./src/lib/cloudflare-image-loader.ts",
    }
  : {
      formats: ["image/avif", "image/webp"],
      minimumCacheTTL: 31536000,
      remotePatterns: [
        {
          protocol: "https",
          hostname: "cdn.bookinaja.com",
          pathname: "/**",
        },
        {
          protocol: "https",
          hostname: "cdn-test.bookinaja.com",
          pathname: "/**",
        },
        {
          protocol: "https",
          hostname: "images.unsplash.com",
          pathname: "/**",
        },
      ],
    };

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  // PENTING: Untuk deploy di Docker VPS (IDCloudHost)
  output: "standalone",

  // Konfigurasi Image Optimization untuk Cloudflare R2
  images: imagesConfig,

  // Cross-Origin and Subdomain Security
  // Tambahkan domain produksi agar Server Actions & Middleware jalan lancar
  experimental: {
    serverActions: {
      allowedOrigins: [
        "bookinaja.com",
        "*.bookinaja.com",
        "lapisbaja.bookinaja.com",
        "localhost:3000",
        "lvh.me",
        "lvh.me:3000",
        "*.lvh.me",
        "gaming-demo.lvh.me",
        "office-demo.lvh.me",
        "sports-demo.lvh.me",
        "*.lvh.me:3000",
      ],
    },
  },

  // Konfigurasi development tetap dipertahankan
  allowedDevOrigins: [
    "minibos.bookinaja.com",
    "*.bookinaja.com",
    "localhost",
    "localhost:3000",
    "bookinaja.local",
    "*.bookinaja.local",
    "lvh.me",
    "lvh.me:3000",
    "*.lvh.me",
    "gaming-demo.lvh.me",
    "office-demo.lvh.me",
    "sports-demo.lvh.me",
    "studio-demo.lvh.me",
    "*.lvh.me:3000",
  ],
};

export default nextConfig;
