"use client";

import { createContext, useContext, useState } from "react";

const TenantContext = createContext<any>(null);

export function TenantProvider({ children, initialData }: any) {
  // Kita simpan data awal dari server ke state
  const [profile] = useState(initialData);

  return (
    <TenantContext.Provider value={{ profile }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);
