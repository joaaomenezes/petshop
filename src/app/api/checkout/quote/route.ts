import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { quoteSchema } from "@/lib/checkout/schema";
import {
  publicCheckoutClient,
  readBody,
  safeCheckoutError,
  checkoutReadiness,
} from "@/lib/checkout/server";
import {
  nationalShippingEnabled,
  quoteNational,
  allowFreightAttempt,
} from "@/lib/checkout/national-shipping";
import { sameOrigin, sessionHash } from "@/lib/checkout/server";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  try {
    const data = quoteSchema.parse(await readBody(request));
    if (nationalShippingEnabled()) {
      const hash = (await sessionHash(true))!;
      if (!allowFreightAttempt(hash))
        return NextResponse.json(
          { error: "Muitas consultas de frete. Aguarde um minuto." },
          { status: 429 },
        );
      const quotes = await quoteNational(data.items, data.address, hash);
      return NextResponse.json(
        { quotes, paymentReady: checkoutReadiness().ready, testMode: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
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
        configurationPending:
          !(error instanceof ZodError) &&
          /Frete nacional em preparação|Frete nacional ainda|Produto sem peso/.test(
            String((error as { message?: string })?.message),
          ),
        error:
          error instanceof ZodError
            ? "Confira os dados do endereço e do carrinho."
            : safeCheckoutError(error),
      },
      { status: 400 },
    );
  }
}
