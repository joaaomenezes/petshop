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
  if (section === "configuracoes") return <SettingsManager data={data} />;
  return (
    <EntityManager
      kind={section as "categorias" | "marcas" | "fornecedores"}
      data={data}
    />
  );
}
