import { Suspense } from "react";
import PhoneLoginClient from "./phone-login-client";

export default function PhoneLoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PhoneLoginClient />
    </Suspense>
  );
}
