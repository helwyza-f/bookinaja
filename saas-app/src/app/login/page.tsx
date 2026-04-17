import { Suspense } from "react";
import { PlatformLoginForm } from "./platform-login-form";

export default function PlatformLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <PlatformLoginForm />
    </Suspense>
  );
}

