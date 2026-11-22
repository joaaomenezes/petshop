import { notFound } from "next/navigation";
import { z } from "zod";
import { OrderStatus } from "@/components/checkout/order-status";
export const metadata = {
  title: "Acompanhar pedido",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  return <OrderStatus id={id} />;
}
