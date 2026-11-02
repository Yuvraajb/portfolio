"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export const LoginForm = () => {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        // Full navigation so the proxy re-evaluates the new session cookie.
        router.replace("/admin");
        router.refresh();
        return;
      }

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Invalid credentials.");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
      setPassword("");
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="eyebrow">Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          autoFocus
          required
          className="border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 font-mono text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-accent)]"
        />
      </label>

      {error ? (
        <p
          role="alert"
          className="border border-red-900/50 bg-red-950/30 px-4 py-3 font-mono text-xs text-red-300"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || password.length === 0}
        className="border border-[var(--color-accent)] bg-[var(--color-accent)]/10 px-4 py-3 font-mono text-sm text-[var(--color-accent-bright)] transition-colors hover:bg-[var(--color-accent)]/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Checking…" : "Enter"}
      </button>
    </form>
  );
};
