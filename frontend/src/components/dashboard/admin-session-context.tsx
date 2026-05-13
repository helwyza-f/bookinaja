"use client";

import { createContext, useContext } from "react";
import type { AdminSessionUser } from "@/lib/admin-access";

type AdminSessionContextValue = {
  user: AdminSessionUser | null;
  tenantName: string;
  tenantCategory?: string;
  growthVisible: boolean;
  planFeatures: string[];
};

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

export function AdminSessionProvider({
  value,
  children,
}: {
  value: AdminSessionContextValue;
  children: React.ReactNode;
}) {
  return (
    <AdminSessionContext.Provider value={value}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  const context = useContext(AdminSessionContext);
  if (!context) {
    throw new Error("useAdminSession must be used within AdminSessionProvider");
  }
  return context;
}
