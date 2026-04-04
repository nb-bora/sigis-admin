import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { useLocale } from "@/lib/locale";
import { api } from "@/lib/api";
import { Mail, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(undefined);
    const trimmed = email.trim();
    if (!trimmed) {
      setFieldError(t("auth.forgot.fieldRequired"));
      toast.error(t("auth.forgot.toastEmailTitle"), {
        description: t("auth.forgot.toastEmailDesc"),
      });
      return;
    }

    setLoading(true);
    const loadingId = toast.loading(t("auth.forgot.toastLoading"));
    try {
      await api.post<{ detail?: string }>("/auth/request-password-reset", { email: trimmed });
      toast.dismiss(loadingId);
      setSubmitted(true);
      toast.success(t("auth.forgot.toastSuccessTitle"), {
        description: t("auth.forgot.toastSuccessDesc"),
        duration: 8000,
      });
    } catch (err) {
      toast.dismiss(loadingId);
      const message =
        err instanceof Error ? err.message : t("auth.forgot.toastFailGeneric");
      toast.error(t("auth.forgot.toastFailTitle"), { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell>
      <div className="rounded-2xl border border-border/80 bg-card/95 p-8 shadow-xl shadow-black/[0.04] backdrop-blur-sm">
        <div className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("auth.forgot.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("auth.forgot.subtitle")}</p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("auth.forgot.doneIntro", { email: email.trim() })}
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("auth.forgot.backLogin")}
              </Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="forgot-email" className="text-sm font-medium">
                {t("auth.forgot.email")}
              </Label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70"
                  aria-hidden
                />
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder={t("auth.login.placeholderEmail")}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldError(undefined);
                  }}
                  autoComplete="email"
                  autoFocus
                  disabled={loading}
                  aria-invalid={Boolean(fieldError)}
                  aria-describedby={fieldError ? "forgot-email-error" : undefined}
                  className={cn(
                    "h-11 pl-10 transition-shadow",
                    fieldError && "border-destructive ring-destructive/20 focus-visible:ring-destructive/30",
                  )}
                />
              </div>
              {fieldError && (
                <p id="forgot-email-error" className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {fieldError}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="h-11 w-full text-base font-semibold shadow-md shadow-primary/20"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  {t("auth.forgot.submitting")}
                </>
              ) : (
                t("auth.forgot.submit")
              )}
            </Button>

            <p className="text-center text-sm">
              <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                {t("auth.forgot.backLogin")}
              </Link>
            </p>
          </form>
        )}
      </div>
    </AuthPageShell>
  );
}
