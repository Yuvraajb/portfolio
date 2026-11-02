import Link from "next/link";
import getMetadata from "./lib/metadata";

export const metadata = getMetadata({ title: "Not found", noIndex: true });

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
      <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
        404
      </p>
      <h1 className="text-2xl font-medium tracking-tight">Page not found.</h1>
      <Link href="/" className="text-sm underline">
        Back to site
      </Link>
    </div>
  );
}
