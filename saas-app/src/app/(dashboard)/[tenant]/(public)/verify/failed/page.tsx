import { Suspense } from "react";
import VerifyFailedClient from "./verify-failed-client";

export default function VerifyFailedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6" />
      }
    >
      <VerifyFailedClient />
    </Suspense>
  );
}
