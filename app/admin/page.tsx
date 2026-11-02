import { buildSummary } from "@/app/lib/analytics/aggregate";
import getMetadata from "@/app/lib/metadata";
import { Container } from "@/components/layout-primitives";
import { Panel, RankedList, StatTile, TrafficChart } from "./components/panels";
import { SeoPanel } from "./components/seo-panel";
import { LogoutButton } from "./components/logout-button";

export const metadata = getMetadata({ title: "Console", noIndex: true });

/** Private data: never prerendered, never cached. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

const duration = (seconds: number): string =>
  seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;

export default async function AdminPage() {
  // Analytics only. The SEO audit is deliberately NOT awaited here — it
  // fetches a dozen routes, which on a serverless host means a dozen further
  // invocations of this same function. Doing that inline hung /admin in
  // production, so <SeoPanel> loads it client-side after first paint.
  const summary = await buildSummary(30);

  return (
    <div className="min-h-dvh pb-24">
      <header className="border-b border-[var(--color-line)]">
        <Container className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-block size-1.5 rounded-full bg-[var(--color-accent)]" />
            <span className="font-mono text-sm">yuvraaj</span>
            <span className="font-mono text-sm text-[var(--color-faint)]">console</span>
          </div>
          <div className="flex items-center gap-5">
            <span className="hidden font-mono text-[11px] text-[var(--color-faint)] sm:inline">
              {summary.range.from} → {summary.range.to}
            </span>
            <LogoutButton />
          </div>
        </Container>
      </header>

      <Container className="pt-10">
        {!summary.configured ? (
          <div className="mb-8 border border-amber-900/50 bg-amber-950/20 px-5 py-4">
            <p className="font-mono text-xs text-amber-300">
              Analytics storage is not configured on this deployment.
            </p>
            <p className="mt-1.5 font-mono text-[11px] text-amber-200/70">
              Events are being discarded. Create a Vercel Blob store and set
              BLOB_READ_WRITE_TOKEN to start recording. The zeros below are
              real zeros, not collected data.
            </p>
          </div>
        ) : null}

        <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatTile label="Page views" value={String(summary.totals.views)} hint="30 days" />
          <StatTile
            label="Unique visitors"
            value={String(summary.totals.visitors)}
            hint="daily-rotating hash"
          />
          <StatTile
            label="Avg. time on page"
            value={duration(summary.totals.avgDwellSeconds)}
          />
          <StatTile
            label="Avg. scroll depth"
            value={`${summary.totals.avgScrollDepth}%`}
          />
          <StatTile
            label="Outbound clicks"
            value={String(summary.totals.outboundClicks)}
          />
        </div>

        <div className="mb-4">
          <Panel
            title="Traffic"
            action={
              <span className="font-mono text-[10px] text-[var(--color-faint)]">
                store: {summary.storage}
              </span>
            }
          >
            <TrafficChart timeline={summary.timeline} />
          </Panel>
        </div>

        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <Panel title="Top pages">
            <RankedList
              rows={summary.topPages.map((p) => ({
                label: p.path,
                value: p.views,
                sub: p.avgDwellSeconds ? duration(p.avgDwellSeconds) : undefined,
              }))}
            />
          </Panel>

          <Panel title="Referrers">
            <RankedList
              rows={summary.topReferrers.map((r) => ({
                label: r.referrer,
                value: r.views,
              }))}
            />
          </Panel>

          <Panel title="Countries">
            <RankedList
              rows={summary.countries.map((c) => ({
                label: c.country,
                value: c.views,
              }))}
              emptyLabel="Geo data appears once deployed to Vercel."
            />
          </Panel>

          <Panel title="Devices">
            <RankedList
              rows={summary.devices.map((d) => ({
                label: d.device,
                value: d.views,
              }))}
            />
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Outbound links">
            <RankedList
              rows={summary.outbound.map((o) => ({
                label: o.href.replace(/^https?:\/\//, ""),
                value: o.clicks,
              }))}
            />
          </Panel>

          <SeoPanel />
        </div>
      </Container>
    </div>
  );
}
