import { notFound, redirect } from "next/navigation";
import { DISCOVERY_PUBLIC_ENABLED } from "@/lib/feature-flags";

export default async function LegacyDiscoverPostRedirectPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  if (!DISCOVERY_PUBLIC_ENABLED) notFound();
  const { postId } = await params;
  redirect(`/discovery/${postId}`);
}
