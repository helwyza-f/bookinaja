// src/app/(dashboard)/[tenant]/layout.tsx
import { TenantProvider } from "@/context/tenant-context";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RESERVED_TENANT_SLUGS = new Set([
  "",
  "www",
  "api",
  "admin",
  "login",
  "register",
  "public",
  "me",
  "dashboard",
  "site.webmanifest",
  "favicon.ico",
]);

export default async function TenantRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>; // 1. Ubah tipe data jadi Promise
}) {
  // 2. UNWRAP si params pake await
  const resolvedParams = await params;
  const tenantSlug = resolvedParams.tenant;

  if (
    !tenantSlug ||
    tenantSlug.includes(".") ||
    RESERVED_TENANT_SLUGS.has(tenantSlug.toLowerCase())
  ) {
    notFound();
  }

  let initialProfile = null;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/public/profile?slug=${tenantSlug}`,
      { cache: "no-store" },
    );

    if (res.ok) {
      initialProfile = await res.json();
    }
  } catch (error) {
    console.error("Layout pre-fetch failed:", error);
  }

  return (
    <TenantProvider initialData={initialProfile}>
      <div className="min-h-screen w-full bg-white dark:bg-[#050505]">
        {children}
      </div>
    </TenantProvider>
  );
}
