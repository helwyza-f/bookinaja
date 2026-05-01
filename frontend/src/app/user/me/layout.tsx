import { CustomerPortalShell } from "./portal-shell";

export default function UserMeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerPortalShell>{children}</CustomerPortalShell>;
}
