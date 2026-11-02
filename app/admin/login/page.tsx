import getMetadata from "@/app/lib/metadata";
import { LoginForm } from "./login-form";

export const metadata = getMetadata({ title: "Sign in", noIndex: true });

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="inline-block size-1.5 rounded-full bg-[var(--color-accent)]" />
          <span className="font-mono text-sm text-[var(--color-ink)]">
            yuvraaj
          </span>
          <span className="font-mono text-sm text-[var(--color-faint)]">
            console
          </span>
        </div>

        <h1 className="mb-2 text-2xl font-medium tracking-tight">Sign in</h1>
        <p className="mb-8 text-sm text-[var(--color-muted)]">
          This console is private.
        </p>

        <LoginForm />
      </div>
    </div>
  );
}
