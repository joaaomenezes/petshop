"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="admin-panel">
      <h1>Não foi possível carregar os dados.</h1>
      <p>Verifique a conexão, a sessão e as migrations do Supabase.</p>
      <button className="button" onClick={reset}>
        Tentar novamente
      </button>
    </section>
  );
}
