"use client";
import { useActionState } from "react";
import { login } from "@/lib/admin/actions";
export function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(login, {
    ok: false,
    message: "",
  });
  return (
    <form action={action} className="admin-form">
      <label>
        E-mail
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          disabled={!configured}
        />
      </label>
      <label>
        Senha
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          disabled={!configured}
        />
      </label>
      <p role="alert">{state.message}</p>
      <button className="button" disabled={!configured || pending}>
        {pending ? "Entrando…" : "Entrar no painel"}
      </button>
    </form>
  );
}
