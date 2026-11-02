import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import CONFIG from "@/app/lib/config";

export const runtime = "nodejs";

/**
 * Dynamic Open Graph card: `/og?title=...&subtitle=...`
 *
 * `lib/metadata.ts` points here whenever a page doesn't supply its own image,
 * so every route gets a real social card without hand-authoring one.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.slice(0, 120) || CONFIG.NAME;
  const subtitle = searchParams.get("subtitle")?.slice(0, 160) || "";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0b0c",
          color: "#e9e6df",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 64, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            {title}
          </div>
          {subtitle ? (
            <div style={{ fontSize: 30, color: "#9b968c", lineHeight: 1.35 }}>
              {subtitle}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", fontSize: 24, color: "#9b968c" }}>
          {CONFIG.NAME.toLowerCase().replace(" ", ".")}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
