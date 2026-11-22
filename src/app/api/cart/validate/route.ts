import { NextResponse } from "next/server";
import { z } from "zod";
import { getCatalog } from "@/lib/shop-catalog";
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 20000)
      return NextResponse.json(
        { error: "Carrinho muito grande." },
        { status: 413 },
      );
    const text = await request.text();
    if (text.length > 20000)
      return NextResponse.json(
        { error: "Carrinho muito grande." },
        { status: 413 },
      );
    const parsed = z
      .array(
        z
          .object({
            variantId: z.string().min(1).max(100),
            productId: z.string().min(1).max(100).optional(),
            quantity: z.number().int().min(1).max(9999),
          })
          .strict(),
      )
      .min(1)
      .max(100)
      .parse(JSON.parse(text));
    if (
      new Set(parsed.map((l) => `${l.productId || ""}:${l.variantId}`)).size !==
      parsed.length
    )
      return NextResponse.json(
        { error: "Variantes duplicadas." },
        { status: 400 },
      );
    const catalog = await getCatalog();
    if (
      parsed.some(
        (line) =>
          !line.productId &&
          catalog.products.filter((p) =>
            p.variants.some((v) => v.id === line.variantId),
          ).length > 1,
      )
    )
      return NextResponse.json(
        {
          error: "Informe o produto para identificar a variante demonstrativa.",
        },
        { status: 400 },
      );
    const lines = parsed.map((line) => {
      const product = catalog.products.find(
        (p) =>
          (!line.productId || line.productId === p.id) &&
          p.variants.some((v) => v.id === line.variantId),
      );
      const variant = product?.variants.find((v) => v.id === line.variantId);
      return {
        variantId: line.variantId,
        productId: product?.id ?? line.productId ?? null,
        quantity: line.quantity,
        available: !!variant && variant.stock >= line.quantity,
        unitPriceCents: variant?.price ?? null,
        stock: variant?.stock ?? 0,
      };
    });
    return NextResponse.json(
      {
        demo: catalog.demo,
        valid: lines.every((l) => l.available),
        lines,
        totalCents: lines.reduce(
          (sum, l) => sum + (l.unitPriceCents ?? 0) * l.quantity,
          0,
        ),
        notice:
          "Consulta de preço e disponibilidade; não reserva estoque nem cria pedido.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError || error instanceof SyntaxError
            ? "Carrinho inválido."
            : "Não foi possível validar o carrinho.",
      },
      {
        status:
          error instanceof z.ZodError || error instanceof SyntaxError
            ? 400
            : 503,
      },
    );
  }
}
