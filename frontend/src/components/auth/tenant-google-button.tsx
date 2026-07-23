"use client";

import { GoogleIdentityPanel } from "@/components/auth/google-identity-panel";

type TenantGoogleButtonProps = {
  text?: "continue_with" | "signup_with";
  description?: string;
  loading?: boolean;
  className?: string;
  onCredential: (credential: string) => Promise<void> | void;
};

export function TenantGoogleButton({
  text = "continue_with",
  description,
  loading = false,
  className = "",
  onCredential,
}: TenantGoogleButtonProps) {
  return (
    <GoogleIdentityPanel
      text={text}
      description={description}
      loading={loading}
      className={className}
      onCredential={onCredential}
    />
  );
}
