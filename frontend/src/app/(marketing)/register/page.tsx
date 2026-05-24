import { redirect } from "next/navigation";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const ref = params?.ref;
  const referralCode = Array.isArray(ref) ? ref[0] : ref;
  redirect(referralCode ? `/signup?ref=${encodeURIComponent(referralCode)}` : "/signup");
}
