import { Suspense } from "react";
import UserLoginClient from "./user-login-client";

export default function UserLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-[#050505]" />
      }
    >
      <UserLoginClient />
    </Suspense>
  );
}
