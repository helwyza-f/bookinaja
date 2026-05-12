import ResetPasswordEmailClient from "./reset-password-email-client";

export default async function ResetPasswordEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <ResetPasswordEmailClient token={params.token || ""} />;
}
