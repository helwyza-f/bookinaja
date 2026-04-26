import { Suspense } from "react";
import UserVerifyClient from "./user-verify-client";

export default function UserBookingVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white" />
      }
    >
      <UserVerifyClient />
    </Suspense>
  );
}
