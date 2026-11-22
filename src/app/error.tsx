"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="container empty">
      <h1>Não foi possível carregar a loja.</h1>
      <p>
        Tente novamente em instantes. Nenhum catálogo demonstrativo substitui os
        dados de uma loja configurada.
      </p>
      <button className="button" onClick={reset}>
        Tentar novamente
      </button>
    </main>
  );
}
