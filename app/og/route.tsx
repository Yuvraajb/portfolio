import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import CONFIG from "@/app/lib/config";

export const runtime = "nodejs";

/**
 * Generated card art: `/og?title=…&subtitle=…&tag=…`
 *
 * Serves two jobs from one renderer:
 *   1. Open Graph images for every route (via `lib/metadata.ts`).
 *   2. Per-project artwork used on the work list hover reveal.
 *
 * The glyph field is drawn deterministically from the title, so each project
 * gets a distinct but on-brand image with no stored assets. That matters: a
 * generic repo screenshot would read as borrowed furniture next to this
 * design, and there are no real screenshots to use.
 */

const RAMP = " =+xX0S8#@";

/** Cheap deterministic hash → every title yields a stable, unique field. */
const hash = (value: string): number => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const glyphRows = (seed: number, rows: number, cols: number) => {
  let state = seed || 1;
  const next = () => {
    // xorshift32 — deterministic and fast enough for a 630px card.
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };

  return Array.from({ length: rows }, (_, y) => {
    // Density falls off down the card, mirroring the hero's `horizon` shape.
    // Linear (not squared) so the field still reads in the lower half instead
    // of collapsing to blank space behind the type.
    const falloff = 0.30 + 0.70 * (1 - y / rows);
    return Array.from({ length: cols }, () => {
      const v = next() * falloff;
      return RAMP[Math.min(RAMP.length - 1, Math.floor(v * RAMP.length))];
    }).join("");
  });
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.slice(0, 90) || CONFIG.NAME;
  const subtitle = searchParams.get("subtitle")?.slice(0, 140) || "";
  const tag = searchParams.get("tag")?.slice(0, 48) || "";

  const rows = glyphRows(hash(title), 20, 84);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#07080a",
          color: "#e8eaed",
          padding: "64px 72px",
          position: "relative",
        }}
      >
        {/* Glyph field, seeded by the title */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            fontFamily: "monospace",
            fontSize: 17,
            lineHeight: 1.55,
            letterSpacing: 2.6,
            color: "#4d93ff",
            opacity: 0.75,
          }}
        >
          {/* Each row carries its own opacity rather than relying on a
              gradient overlay — Satori doesn't render the multi-stop rgba
              linear-gradient this needed, so the falloff is baked per row.
              Rows behind the type fade to near-nothing, keeping it legible. */}
          {rows.map((row, i) => {
            const t = i / (rows.length - 1);
            return (
              <div
                key={i}
                style={{
                  whiteSpace: "pre",
                  opacity: Math.max(0.05, 1 - Math.pow(t, 0.75) * 1.25),
                }}
              >
                {row}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex" }} />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {tag ? (
            <div
              style={{
                display: "flex",
                fontFamily: "monospace",
                fontSize: 20,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "#7dd3fc",
              }}
            >
              {tag}
            </div>
          ) : null}

          <div
            style={{
              fontSize: title.length > 34 ? 56 : 72,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              display: "flex",
            }}
          >
            {title}
          </div>

          {subtitle ? (
            <div
              style={{
                fontSize: 27,
                color: "#a1a7b0",
                lineHeight: 1.35,
                display: "flex",
                maxWidth: 880,
              }}
            >
              {subtitle}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              marginTop: 10,
              fontFamily: "monospace",
              fontSize: 20,
              color: "#7c828c",
            }}
          >
            yuvraajb.vercel.app
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
