import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

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
    default: "Bookinaja | Sistem Operasional Bisnis Rental",
    template: "%s | Bookinaja",
  },
  description:
    "Bookinaja membantu bisnis rental membuat booking lebih rapi, operasional lebih terkontrol, dan owner lebih tenang menjalankan bisnisnya.",
  metadataBase: new URL("https://bookinaja.com"),
  applicationName: "Bookinaja",
  keywords: [
    "bookinaja",
    "software booking rental",
    "sistem booking bisnis rental",
    "aplikasi booking rental",
    "sistem operasional bisnis rental",
    "booking bisnis persewaan",
    "software rental Indonesia",
  ],
  authors: [{ name: "Bookinaja" }],
  creator: "Bookinaja",
  publisher: "Bookinaja",
  category: "business",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://bookinaja.com",
    siteName: "Bookinaja",
    title: "Bookinaja | Sistem Operasional Bisnis Rental",
    description:
      "Bookinaja membantu bisnis rental membuat booking lebih rapi, operasional lebih terkontrol, dan owner lebih tenang menjalankan bisnisnya.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bookinaja | Sistem Operasional Bisnis Rental",
    description:
      "Bookinaja membantu bisnis rental membuat booking lebih rapi, operasional lebih terkontrol, dan owner lebih tenang menjalankan bisnisnya.",
  },
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
        suppressHydrationWarning
        className="font-sans antialiased bg-background text-foreground transition-colors duration-300"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
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
