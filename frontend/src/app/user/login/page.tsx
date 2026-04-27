import { Suspense } from "react";
import UserLoginClient from "./user-login-client";

export default function UserLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.14),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-6 dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_34%),linear-gradient(180deg,#050505_0%,#0b1220_100%)]">
          <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md items-center justify-center">
            <div className="flex items-center gap-3 rounded-full border border-white/70 bg-white/80 px-4 py-3 text-sm font-medium text-slate-600 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.3)] backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-600 dark:bg-sky-300" />
              Menyiapkan login...
            </div>
          </div>
        </div>
      }
    >
      <UserLoginClient />
    </Suspense>
  );
}
