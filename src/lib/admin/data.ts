import "server-only";
import { cache } from "react";
import { guardAdmin } from "./auth";
import type { AdminData } from "./schema";
export const getAdminData = cache(async (): Promise<AdminData> => {
  const { db } = await guardAdmin();
  const result = await db.rpc("admin_catalog");
  if (result.error)
    throw new Error(
      "Não foi possível carregar o painel. Confira as migrations e tente novamente.",
    );
  const data = result.data as unknown as AdminData;
  data.images = await Promise.all(
    data.images.map(async (image) => {
      const signed = await db.storage
        .from("product-images")
        .createSignedUrl(image.storage_path, 3600);
      return { ...image, preview: signed.data?.signedUrl };
    }),
  );
  return data;
});
