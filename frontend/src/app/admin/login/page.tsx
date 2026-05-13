import { Suspense } from "react";
import { AdminLoginClient } from "./admin-login-client";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <AdminLoginClient />
    </Suspense>
  );
}
