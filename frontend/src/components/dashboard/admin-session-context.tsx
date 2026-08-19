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
  // Grace mode: langganan non-aktif (trial habis / belum bayar). graceActive =
  // tak boleh buat item baru; canCreate = kebalikannya. Selaras backend.
  graceActive?: boolean;
  canCreate?: boolean;
  // Eskalasi grace berbasis WAKTU (selaras access.GracePhase backend):
  //   gracePhase: 0 aktif | 1 soft | 2 friksi | 3 lock
  //   graceDays: umur grace (hari sejak langganan lewat)
  //   frictionDay / lockDay: ambang hari utk hitung mundur
  //   transactionsAllowed: boleh buat transaksi/booking/order baru
  gracePhase?: number;
  graceDays?: number;
  frictionDay?: number;
  lockDay?: number;
  transactionsAllowed?: boolean;
};

type AdminSessionContextValue = {
  user: AdminSessionUser | null;
  tenantName: string;
  tenantSlug?: string;
  tenantCategory?: string;
  growthVisible: boolean;
  fnbMode?: "integrated" | "standalone" | "off";
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
