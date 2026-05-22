"use client";

import { SettingsCenterFrame } from "@/components/dashboard/settings-center-frame";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SettingsCenterFrame>{children}</SettingsCenterFrame>;
}
