"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export const LogoutButton = () => {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
        router.replace("/admin/login");
        router.refresh();
      }}
      className="font-mono text-[11px] text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)] disabled:opacity-50"
    >
      {pending ? "…" : "Sign out"}
    </button>
  );
};
