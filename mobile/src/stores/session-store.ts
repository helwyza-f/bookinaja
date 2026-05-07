import { create } from "zustand";
import { clearSessionSnapshot, readSessionSnapshot, writeSessionSnapshot } from "@/lib/session/storage";
import type { AppRole, SessionSnapshot } from "@/types/session";

type SessionState = SessionSnapshot & {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  signInAsRole: (payload: Partial<SessionSnapshot> & { role: Exclude<AppRole, "guest">; token: string }) => Promise<void>;
  setTenantContext: (payload: { tenantSlug?: string | null; tenantId?: string | null }) => Promise<void>;
  signOut: () => Promise<void>;
};

const guestSnapshot: SessionSnapshot = {
  token: null,
  role: "guest",
  tenantSlug: null,
  tenantId: null,
  customerId: null,
  adminName: null,
};

export const useSessionStore = create<SessionState>((set, get) => ({
  ...guestSnapshot,
  hydrated: false,
  hydrate: async () => {
    const snapshot = await readSessionSnapshot();
    set({
      ...(snapshot || guestSnapshot),
      hydrated: true,
    });
  },
  signInAsRole: async (payload) => {
    const snapshot: SessionSnapshot = {
      ...guestSnapshot,
      ...payload,
    };
    set(snapshot);
    await writeSessionSnapshot(snapshot);
  },
  setTenantContext: async (payload) => {
    const current = get();
    const next: SessionSnapshot = {
      token: current.token,
      role: current.role,
      customerId: current.customerId,
      adminName: current.adminName,
      tenantSlug:
        payload.tenantSlug !== undefined ? payload.tenantSlug : current.tenantSlug,
      tenantId:
        payload.tenantId !== undefined ? payload.tenantId : current.tenantId,
    };

    if (
      next.tenantSlug === current.tenantSlug &&
      next.tenantId === current.tenantId
    ) {
      return;
    }

    set(next);
    await writeSessionSnapshot(next);
  },
  signOut: async () => {
    await clearSessionSnapshot();
    set({
      ...guestSnapshot,
      hydrated: true,
    });
  },
}));
