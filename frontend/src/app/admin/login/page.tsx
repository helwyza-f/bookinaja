"use client";

import { useEffect } from "react";
import { getGlobalAuthLoginUrl } from "@/lib/tenant";

export default function AdminLoginPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextUrl = params.get("next") || "";
    window.location.replace(getGlobalAuthLoginUrl({ next: nextUrl }));
  }, []);

  return <div className="min-h-screen bg-slate-950" />;
}
