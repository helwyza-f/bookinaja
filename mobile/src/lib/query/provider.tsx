import { QueryClientProvider } from "@tanstack/react-query";
import { appQueryClient } from "./client";

export function AppQueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={appQueryClient}>{children}</QueryClientProvider>;
}
