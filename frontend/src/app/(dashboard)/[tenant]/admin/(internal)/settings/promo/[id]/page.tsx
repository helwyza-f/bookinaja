import { PromoFormScreen } from "../_components/promo-form-screen";

export default async function EditPromoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PromoFormScreen promoId={id} />;
}
