"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buildReport,
  gradeHtml,
  type SeoIssue,
  type SeoReport,
} from "@/app/lib/seo/rules";
import { Panel, SeoIssues } from "./panels";

type State =
  | { status: "loading"; done: number; total: number }
  | { status: "ready"; report: SeoReport }
  | { status: "error"; message: string };

/**
 * SEO audit, run entirely in the browser.
 *
 * The server only supplies the route list; this component fetches each route
 * same-origin and grades the HTML it gets back. That is both more reliable
 * and more honest than auditing server-side — a serverless function
 * requesting its own public hostname loops back through the CDN and times
 * out, which previously scored a perfectly healthy site 0/100.
 */
export const SeoPanel = () => {
  const [state, setState] = useState<State>({
    status: "loading",
    done: 0,
    total: 0,
  });

  // No synchronous loading reset here — state already starts as loading, and
  // resetting it at the top would be a setState during the mount effect. The
  // re-run button resets it from the click instead, where the cause actually is.
  const run = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/seo", { cache: "no-store" });
      const data = (await res.json()) as { routes?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      const routes = data.routes ?? [];
      const issues: SeoIssue[] = [];

      // Sequential on purpose: this is a background nicety on a single-user
      // page, and hammering the site with a dozen parallel requests to grade
      // its own performance would be self-defeating.
      for (const [i, route] of routes.entries()) {
        setState({ status: "loading", done: i, total: routes.length });
        try {
          const page = await fetch(route, {
            cache: "no-store",
            headers: { "X-Seo-Audit": "1" },
          });
          issues.push(...gradeHtml(route, await page.text()));
        } catch (error) {
          issues.push({
            severity: "error",
            route,
            check: "Reachable",
            detail: error instanceof Error ? error.message : "Fetch failed",
          });
        }
      }

      setState({ status: "ready", report: buildReport(issues, routes.length) });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Audit failed.",
      });
    }
  }, []);

  useEffect(() => {
    // Deferred by a tick so the audit starts after the dashboard has painted,
    // and so no state update happens synchronously inside the effect body.
    const id = setTimeout(() => void run(), 0);
    return () => clearTimeout(id);
  }, [run]);

  return (
    <Panel
      title="SEO health"
      action={
        <button
          type="button"
          onClick={() => {
            setState({ status: "loading", done: 0, total: 0 });
            void run();
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
          Grading what a crawler sees…
          {state.total > 0 ? ` ${state.done}/${state.total}` : ""}
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
