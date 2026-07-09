"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

type CompactGoogleButtonProps = {
  text?: "continue_with" | "signup_with" | "signin_with";
  loading?: boolean;
  onCredential: (credential: string) => Promise<void> | void;
};

export function CompactGoogleButton({
  text = "continue_with",
  loading = false,
  onCredential,
}: CompactGoogleButtonProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [scriptReady, setScriptReady] = useState(
    () => typeof window !== "undefined" && !!window.google?.accounts?.id,
  );
  const googleClientID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const handleCredential = useEffectEvent(async (credential: string) => {
    await onCredential(credential);
  });

  useEffect(() => {
    if (!googleClientID || scriptReady) return;

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-identity-services="true"]',
    );
    if (existing) {
      const markReady = () => {
        if (window.google?.accounts?.id) setScriptReady(true);
      };
      markReady();
      existing.addEventListener("load", markReady);
      const timer = window.setInterval(markReady, 250);
      return () => {
        existing.removeEventListener("load", markReady);
        window.clearInterval(timer);
      };
    }

    let disposed = false;
    const markReady = () => {
      if (!disposed && window.google?.accounts?.id) setScriptReady(true);
    };
    const timer = window.setInterval(markReady, 250);
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentityServices = "true";
    script.onload = markReady;
    document.head.appendChild(script);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      script.onload = null;
    };
  }, [googleClientID, scriptReady]);

  useEffect(() => {
    if (!scriptReady || !buttonRef.current || !googleClientID || !window.google?.accounts?.id) {
      return;
    }

    buttonRef.current.innerHTML = "";
    window.google.accounts.id.initialize({
      client_id: googleClientID,
      callback: async (response) => {
        if (!response.credential) return;
        await handleCredential(response.credential);
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width: Math.min(buttonRef.current.clientWidth || 380, 400),
      text,
      shape: "pill",
      logo_alignment: "left",
    });
  }, [googleClientID, scriptReady, text]);

  if (!googleClientID) return null;

  return (
    <div className="relative space-y-2">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-sm transition-colors dark:border-white/10 dark:bg-white/[0.03]">
        {!scriptReady ? (
          <div className="flex h-11 w-full items-center justify-center gap-3 rounded-xl bg-slate-50 text-sm font-semibold text-slate-500 dark:bg-white/[0.04] dark:text-slate-300">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-black text-slate-700 shadow-sm dark:bg-slate-950 dark:text-slate-200">
              G
            </span>
            <span>Menyiapkan Google</span>
          </div>
        ) : null}
        <div
          ref={buttonRef}
          className={scriptReady ? "min-h-[44px] w-full [&>div]:mx-auto" : "h-0 overflow-hidden"}
        />
      </div>
      {!scriptReady ? (
        <p className="text-center text-xs text-slate-400">Koneksi aman ke Google Identity.</p>
      ) : null}
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-blue-100 bg-white/90 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/90 dark:text-slate-200">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600" />
          Memproses Google
        </div>
      ) : null}
    </div>
  );
}
