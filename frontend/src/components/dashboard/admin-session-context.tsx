"use client";

import { createContext, useContext } from "react";
import type { AdminSessionUser } from "@/lib/admin-access";

export type WorkspaceSummary = {
  id?: string;
  name: string;
  slug: string;
  role?: string;
  logo_url?: string;
  onboarding_completed?: boolean;
};

export type TrialInfo = {
  plan?: string;
  status?: string;
  daysLeft?: number | null;
};

type AdminSessionContextValue = {
  user: AdminSessionUser | null;
  tenantName: string;
  tenantSlug?: string;
  tenantCategory?: string;
  growthVisible: boolean;
  planFeatures: string[];
  planFeatureMatrix: Record<string, string[]>;
  currentWorkspace?: WorkspaceSummary | null;
  workspaces?: WorkspaceSummary[];
  trialInfo?: TrialInfo | null;
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
