import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import { useSessionStore } from "@/stores/session-store";
import { customerKeys } from "@/features/customer/queries";
import type { CustomerDashboard } from "@/features/customer/types";

type CustomerLoginPayload = {
  email: string;
  password: string;
};

type CustomerOtpPayload = {
  phone: string;
};

type CustomerOtpVerifyPayload = {
  phone: string;
  code: string;
};

type CustomerLoginResponse = {
  token: string;
  customer: {
    id: string;
    name: string;
  };
};

type CustomerGoogleProfile = {
  name: string;
  email?: string | null;
  avatar_url?: string | null;
};

type CustomerGoogleLoginResponse =
  | {
      status: "authenticated";
      token: string;
      customer: {
        id: string;
        name: string;
      };
      message?: string;
    }
  | {
      status: "needs_phone";
      claim_token: string;
      profile: CustomerGoogleProfile;
      message?: string;
    };

export function useCustomerEmailLoginMutation() {
  const signInAsRole = useSessionStore((state) => state.signInAsRole);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CustomerLoginPayload) =>
      apiRequest<CustomerLoginResponse>("/public/customer/login-email", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: async (response) => {
      await signInAsRole({
        role: "customer",
        token: response.token,
        customerId: response.customer.id,
        tenantSlug: null,
        tenantId: null,
        adminName: null,
      });

      await queryClient.invalidateQueries({ queryKey: customerKeys.dashboard });
      await queryClient.fetchQuery({
        queryKey: customerKeys.dashboard,
        queryFn: () => apiRequest<CustomerDashboard>("/user/me"),
      });
    },
  });
}

export function useCustomerRequestOtpMutation() {
  return useMutation({
    mutationFn: (payload: CustomerOtpPayload) =>
      apiRequest<{ message: string }>("/public/customer/login", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  });
}

export function useCustomerVerifyOtpMutation() {
  const signInAsRole = useSessionStore((state) => state.signInAsRole);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CustomerOtpVerifyPayload) =>
      apiRequest<CustomerLoginResponse>("/public/customer/verify", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: async (response) => {
      await signInAsRole({
        role: "customer",
        token: response.token,
        customerId: response.customer.id,
        tenantSlug: null,
        tenantId: null,
        adminName: null,
      });

      await queryClient.invalidateQueries({ queryKey: customerKeys.dashboard });
      await queryClient.fetchQuery({
        queryKey: customerKeys.dashboard,
        queryFn: () => apiRequest<CustomerDashboard>("/user/me"),
      });
    },
  });
}

export function useCustomerGoogleLoginMutation() {
  const signInAsRole = useSessionStore((state) => state.signInAsRole);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (idToken: string) =>
      apiRequest<CustomerGoogleLoginResponse>("/public/customer/google/login", {
        method: "POST",
        body: JSON.stringify({ id_token: idToken }),
      }),
    onSuccess: async (response) => {
      if (response.status !== "authenticated") return;

      await signInAsRole({
        role: "customer",
        token: response.token,
        customerId: response.customer.id,
        tenantSlug: null,
        tenantId: null,
        adminName: null,
      });

      await queryClient.invalidateQueries({ queryKey: customerKeys.dashboard });
      await queryClient.fetchQuery({
        queryKey: customerKeys.dashboard,
        queryFn: () => apiRequest<CustomerDashboard>("/user/me"),
      });
    },
  });
}

export function useCustomerGoogleClaimMutation() {
  return useMutation({
    mutationFn: (payload: {
      claimToken: string;
      phone: string;
      name?: string;
      marketingOptIn?: boolean;
    }) =>
      apiRequest<{ message: string; phone: string }>("/public/customer/google/claim", {
        method: "POST",
        body: JSON.stringify({
          claim_token: payload.claimToken,
          phone: payload.phone,
          name: payload.name || "",
          marketing_opt_in: payload.marketingOptIn ?? false,
        }),
      }),
  });
}

export function useCustomerGoogleLinkMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (idToken: string) =>
      apiRequest<{ message: string; customer: { id: string; name: string } }>("/user/me/google/link", {
        method: "POST",
        body: JSON.stringify({ id_token: idToken }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: customerKeys.dashboard });
      await queryClient.fetchQuery({
        queryKey: customerKeys.dashboard,
        queryFn: () => apiRequest<CustomerDashboard>("/user/me"),
      });
    },
  });
}
