import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { quoteSchema } from "@/lib/checkout/schema";
import {
  publicCheckoutClient,
  readBody,
  safeCheckoutError,
  checkoutReadiness,
} from "@/lib/checkout/server";
export async function POST(request: Request) {
  try {
    const data = quoteSchema.parse(await readBody(request));
    const db = publicCheckoutClient();
    if (!db)
      return NextResponse.json(
        { error: "O checkout precisa do catálogo real configurado." },
        { status: 503 },
      );
    const result = await db.rpc("checkout_quote", {
      p_lines: data.items,
      p_postal_code: data.address.postal_code,
      p_city: data.address.city,
      p_state: data.address.state,
    });
    if (result.error)
      return NextResponse.json(
        {
          configurationPending:
            result.error.code === "PGRST202" ||
            result.error.message.includes("Entrega ainda não configurada"),
          error:
            result.error.code === "PGRST202"
              ? "Checkout em preparação. A configuração de entrega ainda não está disponível."
              : safeCheckoutError(result.error),
        },
        { status: result.error.code === "PGRST202" ? 503 : 422 },
      );
    return NextResponse.json(
      {
        quote: result.data,
        paymentReady: checkoutReadiness().ready,
        testMode: true,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof ZodError
            ? "Confira os dados do endereço e do carrinho."
            : safeCheckoutError(error),
      },
      { status: 400 },
    );
  }
}
