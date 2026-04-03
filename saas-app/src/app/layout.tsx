import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans, Syne } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// Font Setup sesuai Brand Identity v1.0
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
});

// Viewport Config
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#07070d" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// Metadata & Ikon Terintegrasi (Next.js File-based Metadata)
export const metadata: Metadata = {
  title: {
    default: "bookinaja.com | All-in-One Booking Platform",
    template: "%s | bookinaja.com",
  },
  description:
    "Otomasi reservasi, billing real-time, dan transformasi digital untuk berbagai sektor bisnis persewaan.",
  metadataBase: new URL("https://bookinaja.com"),
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "android-chrome-192x192",
        url: "/android-chrome-192x192.png",
      },
      {
        rel: "android-chrome-512x512",
        url: "/android-chrome-512x512.png",
      },
    ],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${plusJakarta.variable} ${syne.variable} font-sans antialiased bg-background text-foreground transition-colors duration-300`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
