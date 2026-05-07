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
