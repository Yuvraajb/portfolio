import Link from "next/link";
import getMetadata from "@/app/lib/metadata";

export const metadata = getMetadata({
  title: "Lab",
  description: "Full-viewport experiments and generative work.",
  noIndex: true,
});

/**
 * Entry point for the `(bare)` group. Experiments get their own subroute here
 * (`/lab/<name>`) with the whole viewport and no site chrome.
 */
export default function LabPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
      <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
        Lab
      </p>
      <p className="text-muted-foreground max-w-md text-center text-sm">
        Full-viewport experiments live here, outside the site chrome.
      </p>
      <Link href="/" className="text-sm underline">
        Back to site
      </Link>
    </div>
  );
}
