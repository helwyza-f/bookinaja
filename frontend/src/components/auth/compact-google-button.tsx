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
    <div className="space-y-2">
      <div ref={buttonRef} className="min-h-[44px] w-full" />
      {!scriptReady ? (
        <p className="text-center text-xs text-slate-400">Menyiapkan Google sign-in...</p>
      ) : null}
      {loading ? (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Memproses Google...
        </div>
      ) : null}
    </div>
  );
}
