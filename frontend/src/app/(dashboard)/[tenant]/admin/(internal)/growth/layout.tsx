import { redirect } from "next/navigation";

export default function LegacyGrowthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  void children;
  redirect("/growth/feed");
}
