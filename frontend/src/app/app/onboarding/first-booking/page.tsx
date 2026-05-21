import { Suspense } from "react";
import { OnboardingStepScreen } from "../onboarding-step-screen";

export default function FirstBookingOnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f6f8fb]" />}>
      <OnboardingStepScreen step="first-booking" />
    </Suspense>
  );
}
