import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/locale";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const clearFieldError = (field: "email" | "password") => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      const next: { email?: string; password?: string } = {};
      if (!trimmedEmail) next.email = t("auth.login.errorEmailRequired");
      if (!password) next.password = t("auth.login.errorPasswordRequired");
      setFieldErrors(next);
      toast.error(t("auth.login.toastIncompleteTitle"), {
        description: t("auth.login.toastIncompleteDesc"),
      });
      return;
    }

    setLoading(true);
    const loadingId = toast.loading(t("auth.login.toastLoading"));
    try {
      await login(trimmedEmail, password);
      toast.dismiss(loadingId);
      toast.success(t("auth.login.toastSuccessTitle"), {
        description: t("auth.login.toastSuccessDesc"),
        duration: 4000,
      });
    } catch (err) {
      toast.dismiss(loadingId);
      const message =
        err instanceof Error ? err.message : t("auth.login.toastFailGeneric");
      toast.error(t("auth.login.toastFailTitle"), {
        description: message,
        duration: 6000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell>
      <div className="rounded-2xl border border-border/80 bg-card/95 p-8 shadow-xl shadow-black/[0.04] backdrop-blur-sm">
        <div className="mb-6">
          <h2 className="text-center text-xl font-semibold tracking-tight text-foreground">{t("auth.login.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("auth.login.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              {t("auth.login.email")}
            </Label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70"
                aria-hidden
              />
              <Input
                id="email"
                type="email"
                placeholder={t("auth.login.placeholderEmail")}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError("email");
                }}
                autoComplete="email"
                autoFocus
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                className={cn(
                  "h-11 pl-10 transition-shadow",
                  fieldErrors.email && "border-destructive ring-destructive/20 focus-visible:ring-destructive/30",
                )}
              />
            </div>
            {fieldErrors.email && (
              <p id="email-error" className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              {t("auth.login.password")}
            </Label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70"
                aria-hidden
              />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError("password");
                }}
                autoComplete="current-password"
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
                className={cn(
                  "h-11 pl-10 transition-shadow",
                  fieldErrors.password && "border-destructive ring-destructive/20 focus-visible:ring-destructive/30",
                )}
              />
            </div>
            {fieldErrors.password && (
              <p id="password-error" className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Link
              to="/auth/forgot-password"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("auth.login.forgot")}
            </Link>
          </div>

          <Button
            type="submit"
            className="h-11 w-full text-base font-semibold shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/25"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                {t("auth.login.submitting")}
              </>
            ) : (
              t("auth.login.submit")
            )}
          </Button>
        </form>
      </div>
    </AuthPageShell>
  );
}
