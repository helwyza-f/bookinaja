import type { Metadata } from "next";
import LandingPage from "./page.client";

export const metadata: Metadata = {
  title: "Bookinaja | Sistem Operasional Bisnis Rental",
  description:
    "Berhenti jalankan bisnis secara manual. Bookinaja membantu booking lebih rapi, operasional lebih terkontrol, dan owner lebih tenang menjalankan bisnisnya.",
  keywords: [
    "bookinaja",
    "sistem operasional bisnis rental",
    "software booking rental",
    "aplikasi booking bisnis rental",
    "booking bisnis persewaan",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Bookinaja | Sistem Operasional Bisnis Rental",
    description:
      "Berhenti jalankan bisnis secara manual. Bookinaja membantu booking lebih rapi, operasional lebih terkontrol, dan owner lebih tenang menjalankan bisnisnya.",
    url: "https://bookinaja.com/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bookinaja | Sistem Operasional Bisnis Rental",
    description:
      "Berhenti jalankan bisnis secara manual. Bookinaja membantu booking lebih rapi, operasional lebih terkontrol, dan owner lebih tenang menjalankan bisnisnya.",
  },
};

export default function Page() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Bookinaja",
      url: "https://bookinaja.com/",
      inLanguage: "id-ID",
      description:
        "Bookinaja membantu bisnis rental membuat booking lebih rapi, operasional lebih terkontrol, dan owner lebih tenang menjalankan bisnisnya.",
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Bookinaja",
      url: "https://bookinaja.com/",
      logo: "https://bookinaja.com/android-chrome-512x512.png",
      email: "support@bookinaja.com",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Batam",
        addressRegion: "Kepulauan Riau",
        addressCountry: "ID",
      },
      sameAs: ["https://instagram.com/bookinajacom"],
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Bookinaja",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://bookinaja.com/",
      inLanguage: "id-ID",
      description:
        "Sistem operasional untuk bisnis rental yang membantu booking lebih rapi, operasional lebih terkontrol, dan owner lebih tenang menjalankan bisnisnya.",
      audience: {
        "@type": "Audience",
        audienceType: "Pemilik bisnis rental dan bisnis persewaan",
      },
      areaServed: {
        "@type": "Country",
        name: "Indonesia",
      },
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingPage />
    </>
  );
}
