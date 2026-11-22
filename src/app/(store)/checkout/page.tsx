import { Checkout } from "@/components/checkout/checkout";
import { checkoutReadiness } from "@/lib/checkout/server";
import { connection } from "next/server";
export const metadata = { title: "Finalizar compra" };
export default async function Page() {
  await connection();
  return <Checkout paymentReady={checkoutReadiness().ready} />;
}
