import { redirect } from "next/navigation";

type SearchParams = {
  code?: string;
  token?: string;
};

export default async function TenantBookingVerifyAlias({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const params = await searchParams;
  const code = params?.code || params?.token;
  redirect(
    code ? `/user/verify?code=${encodeURIComponent(code)}` : "/user/verify",
  );
}
