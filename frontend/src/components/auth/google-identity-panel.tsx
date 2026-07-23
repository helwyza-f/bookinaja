"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

type GoogleIdentityPanelProps = {
  text?: "continue_with" | "signup_with";
  description?: string;
  loading?: boolean;
  className?: string;
  onCredential: (credential: string) => Promise<void> | void;
};

export function GoogleIdentityPanel({
  text = "continue_with",
  description,
  loading = false,
  className = "",
  onCredential,
}: GoogleIdentityPanelProps) {
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
    if (!scriptReady || !googleClientID || !window.google?.accounts?.id) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: googleClientID,
      callback: async (response) => {
        if (!response.credential) return;
        await onCredential(response.credential);
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });
  }, [googleClientID, onCredential, scriptReady, text]);

  useEffect(() => {
    if (!scriptReady || !buttonRef.current || !googleClientID || !window.google?.accounts?.id) {
      return;
    }

    buttonRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width: Math.min(buttonRef.current.clientWidth || 360, 360),
      text,
      shape: "pill",
      logo_alignment: "left",
    });
  }, [googleClientID, scriptReady, text]);

  if (!googleClientID) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative overflow-hidden rounded-2xl bg-transparent p-0">
        <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-3 text-center">
          {description ? (
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              {description}
            </p>
          ) : null}
          <div ref={buttonRef} className="min-h-[44px] w-full" />
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/90 text-sm font-semibold text-slate-700 backdrop-blur dark:bg-slate-950/85 dark:text-slate-200">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600" />
              Memproses Google
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
