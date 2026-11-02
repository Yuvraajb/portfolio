"use client";

import { useEffect, useState } from "react";
import type { SeoReport } from "@/app/lib/seo/audit";
import { Panel, SeoIssues } from "./panels";

type State =
  | { status: "loading" }
  | { status: "ready"; report: SeoReport }
  | { status: "error"; message: string };

/**
 * SEO panel, loaded after the dashboard paints.
 *
 * The audit fetches every public route, so it is slow by nature. Running it
 * during the server render blocked the whole dashboard; fetching it here
 * means traffic numbers appear instantly and this fills in behind them.
 */
export const SeoPanel = () => {
  const [state, setState] = useState<State>({ status: "loading" });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/admin/seo", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        setState({ status: "ready", report: data as SeoReport });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Audit failed.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [nonce]);

  return (
    <Panel
      title="SEO health"
      action={
        <button
          type="button"
          // Loading is set here, not at the top of the effect: the click is
          // the cause, and resetting state inside the effect triggers an
          // extra render pass on every run.
          onClick={() => {
            setState({ status: "loading" });
            setNonce((n) => n + 1);
          }}
          disabled={state.status === "loading"}
          className="font-mono text-[10px] text-[var(--color-muted)] transition-colors hover:text-[var(--color-accent-bright)] disabled:opacity-50"
        >
          {state.status === "loading" ? "auditing…" : "re-run"}
        </button>
      }
    >
      {state.status === "loading" ? (
        <p className="py-6 text-center font-mono text-xs text-[var(--color-faint)]">
          Fetching every route and grading what a crawler sees…
        </p>
      ) : state.status === "error" ? (
        <p className="py-6 text-center font-mono text-xs text-amber-300">
          {state.message}
        </p>
      ) : (
        <SeoIssues report={state.report} />
      )}
    </Panel>
  );
};
