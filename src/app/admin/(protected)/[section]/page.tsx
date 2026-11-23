import { nationalShippingEnabled } from "@/lib/checkout/national-shipping";
import { guardAdmin } from "@/lib/admin/auth";
import { ShippingManager } from "@/components/admin/checkout-controls";
import type { ShippingSettings } from "@/lib/checkout/schema";
import { notFound } from "next/navigation";
import { getAdminData } from "@/lib/admin/data";
import {
  EntityManager,
  InventoryManager,
  SettingsManager,
} from "@/components/admin/managers";
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (
    ![
      "categorias",
      "marcas",
      "estoque",
      "fornecedores",
      "configuracoes",
    ].includes(section)
  )
    notFound();
  const data = await getAdminData();
  if (section === "estoque") return <InventoryManager data={data} />;
  if (section === "configuracoes") {
    const { db } = await guardAdmin();
    const shipping = await db
      .from("shipping_settings")
      .select(
        "checkout_enabled,city,state,fee_cents,delivery_estimate,postal_ranges",
      )
      .eq("id", true)
      .maybeSingle();
    return (
      <>
        <SettingsManager data={data} />
        <ShippingManager
          national={nationalShippingEnabled()}
          origin={process.env.MELHOR_ENVIO_ORIGIN_POSTAL_CODE || ""}
          schemaReady={!!data.shippingSchemaReady}
          initial={
            shipping.error ? null : (shipping.data as ShippingSettings | null)
          }
        />
      </>
    );
  }
  return (
    <EntityManager
      kind={section as "categorias" | "marcas" | "fornecedores"}
      data={data}
    />
  );
}
