import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  // PENTING: Untuk deploy di Docker VPS (IDCloudHost)
  output: "standalone",

  // Konfigurasi Image Optimization untuk Cloudflare R2
  images: {
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
  },

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
        "gaming-demo.lvh.me",
        "office-demo.lvh.me",
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
    "gaming-demo.lvh.me",
    "office-demo.lvh.me",
    "*.lvh.me:3000",
  ],
};

export default nextConfig;
