import api from "@/lib/api";

export type WorkspaceListItem = {
  id: string;
  name: string;
  slug: string;
  business_category: string;
  status: string;
  role: string;
  onboarding_state?: {
    current_step: string;
    is_completed: boolean;
  };
};

export type OnboardingState = {
  workspace_id: string;
  current_step: string;
  completed_steps: string[];
  selected_start_mode: string;
  is_completed: boolean;
  seed?: {
    resource?: {
      resource_name?: string;
      resource_category?: string;
      resource_description?: string;
      resource_image_url?: string;
      price_name?: string;
      price?: number;
      price_unit?: string;
      unit_duration?: number;
    };
    business?: {
      open_time?: string;
      close_time?: string;
      whatsapp_number?: string;
    };
    payment_methods?: {
      bank_transfer_enabled?: boolean;
      bank_name?: string;
      bank_account_name?: string;
      bank_account_number?: string;
      bank_instructions?: string;
      qris_static_enabled?: boolean;
      qris_image_url?: string;
      qris_instructions?: string;
    };
  };
};

export async function listWorkspaces() {
  const res = await api.get<{ items: WorkspaceListItem[] }>("/app/workspaces");
  return res.data.items || [];
}

export async function createWorkspace(input: {
  name: string;
  slug?: string;
  business_category?: string;
}) {
  const res = await api.post<{
    workspace: WorkspaceListItem;
  }>("/app/workspaces", input);
  return res.data.workspace;
}

export async function getWorkspaceOnboarding(workspaceId: string) {
  const res = await api.get<OnboardingState>(`/app/workspaces/${workspaceId}/onboarding`);
  return res.data;
}

export async function updateWorkspaceOnboardingStep(
  workspaceId: string,
  step: string,
  input: {
    next_step?: string;
    selected_start_mode?: string;
    complete?: boolean;
    resource_name?: string;
    resource_category?: string;
    resource_description?: string;
    resource_image_url?: string;
    price_name?: string;
    price?: number;
    price_unit?: string;
    unit_duration?: number;
    open_time?: string;
    close_time?: string;
    whatsapp_number?: string;
    payment_methods?: {
      bank_transfer_enabled?: boolean;
      bank_name?: string;
      bank_account_name?: string;
      bank_account_number?: string;
      bank_instructions?: string;
      qris_static_enabled?: boolean;
      qris_image_url?: string;
      qris_instructions?: string;
    };
  } = {},
) {
  const res = await api.put<OnboardingState>(
    `/app/workspaces/${workspaceId}/onboarding/${step}`,
    input,
  );
  return res.data;
}
