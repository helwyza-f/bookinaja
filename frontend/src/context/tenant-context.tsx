"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { BuilderProfile } from "@/lib/page-builder";

type TenantContextValue = {
  profile: BuilderProfile | null;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({
  children,
  initialData,
}: {
  children: ReactNode;
  initialData: BuilderProfile | null;
}) {
  // Kita simpan data awal dari server ke state
  const [profile] = useState(initialData);

  return (
    <TenantContext.Provider value={{ profile }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext) ?? { profile: null };
