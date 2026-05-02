import { redirect } from "next/navigation";

export default async function LegacyDiscoverPostRedirectPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  redirect(`/discovery/${postId}`);
}
