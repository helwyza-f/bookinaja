"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Kasir Menu lama sudah menyatu ke Kasir general.
export default function LegacyKasirMenuRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/kasir");
  }, [router]);
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center text-sm text-slate-400">
      Mengalihkan ke Kasir…
    </main>
  );
}
