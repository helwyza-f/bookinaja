"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

type TenantGoogleButtonProps = {
  text?: "continue_with" | "signup_with";
  title?: string;
  description?: string;
  loading?: boolean;
  className?: string;
  onCredential: (credential: string) => Promise<void> | void;
};

export function TenantGoogleButton({
  text = "continue_with",
  title = "Google access",
  description,
  loading = false,
  className = "",
  onCredential,
}: TenantGoogleButtonProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [scriptReady, setScriptReady] = useState(
    () => typeof window !== "undefined" && !!window.google?.accounts?.id,
  );
  const googleClientID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  useEffect(() => {
    if (!googleClientID || scriptReady) return;

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-identity-services="true"]',
    );
    if (existing) {
      const markReady = () => {
        if (window.google?.accounts?.id) {
          setScriptReady(true);
        }
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
      if (!disposed && window.google?.accounts?.id) {
        setScriptReady(true);
      }
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
    if (
      !scriptReady ||
      !buttonRef.current ||
      !googleClientID ||
      !window.google?.accounts?.id
    ) {
      return;
    }

    buttonRef.current.innerHTML = "";
    window.google.accounts.id.initialize({
      client_id: googleClientID,
      callback: async (response) => {
        if (!response.credential) return;
        await onCredential(response.credential);
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    const width = Math.min(buttonRef.current.clientWidth || 360, 360);
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width,
      text,
      shape: "pill",
      logo_alignment: "left",
    });
  }, [googleClientID, onCredential, scriptReady, text]);

  if (!googleClientID) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[#1d4ed8] dark:text-sky-300">
        <Sparkles className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="rounded-[1.75rem] border border-[#1d4ed81a] bg-white/80 p-4 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.22)] backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
        <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-3 text-center">
          {description ? (
            <p className="text-sm leading-6 text-[#334155] dark:text-slate-400">
              {description}
            </p>
          ) : null}
          <div ref={buttonRef} className="min-h-[44px]" />
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memproses Google sign-in...
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
