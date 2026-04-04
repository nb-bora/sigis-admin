import { Shield } from "lucide-react";
import type { ReactNode } from "react";
import { useLocale } from "@/lib/locale";

type AuthPageShellProps = {
  children: ReactNode;
};

/** Fond et en-tête SIGIS communs aux écrans de connexion / mot de passe. */
export function AuthPageShell({ children }: AuthPageShellProps) {
  const { t } = useLocale();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[hsl(214_32%_97%)]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,hsl(224_71%_92%/0.7),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,hsl(201_96%_32%/0.08),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(hsl(214_32%_91%)_1px,transparent_1px),linear-gradient(90deg,hsl(214_32%_91%)_1px,transparent_1px)] [background-size:48px_48px]"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[hsl(224_71%_32%)] shadow-lg shadow-primary/25 ring-4 ring-primary/10">
              <Shield className="h-8 w-8 text-primary-foreground" strokeWidth={1.75} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">SIGIS</h1>
            <p className="mt-1.5 text-sm font-medium text-muted-foreground">{t("shell.brandSubtitle")}</p>
          </div>

          {children}

          <p className="mt-8 text-center text-[11px] font-medium uppercase tracking-widest text-muted-foreground/80">
            {t("shell.footer")}
          </p>
        </div>
      </div>
    </div>
  );
}
