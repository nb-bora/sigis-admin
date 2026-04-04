import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { useLocale } from "@/lib/locale";
import { api } from "@/lib/api";
import { Lock, Loader2, AlertCircle, ArrowLeft, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MIN_LEN = 8;

export default function ResetPasswordPage() {
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (!tokenFromUrl) {
      toast.error(t("auth.reset.toastMissingTokenTitle"), {
        description: t("auth.reset.toastMissingTokenDesc"),
      });
      return;
    }

    const next: { password?: string; confirm?: string } = {};
    if (password.length < MIN_LEN) {
      next.password = t("auth.reset.errorMinLen", { min: MIN_LEN });
    }
    if (password !== confirm) {
      next.confirm = t("auth.reset.errorMismatch");
    }
    if (Object.keys(next).length) {
      setFieldErrors(next);
      toast.error(t("auth.reset.toastFormTitle"), {
        description: t("auth.reset.toastFormDesc"),
      });
      return;
    }

    setLoading(true);
    const loadingId = toast.loading(t("auth.reset.toastLoading"));
    try {
      await api.post("/auth/reset-password", { token: tokenFromUrl, new_password: password });
      toast.dismiss(loadingId);
      toast.success(t("auth.reset.toastSuccessTitle"), {
        description: t("auth.reset.toastSuccessDesc"),
        duration: 5000,
      });
      navigate("/login", { replace: true });
    } catch (err) {
      toast.dismiss(loadingId);
      const message =
        err instanceof Error ? err.message : t("auth.reset.toastFailGeneric");
      toast.error(t("auth.reset.toastFailTitle"), { description: message, duration: 8000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell>
      <div className="rounded-2xl border border-border/80 bg-card/95 p-8 shadow-xl shadow-black/[0.04] backdrop-blur-sm">
        <div className="mb-6">
          <div className="mb-2 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <KeyRound className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <h2 className="text-center text-xl font-semibold tracking-tight text-foreground">
            {t("auth.reset.title")}
          </h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {t("auth.reset.subtitle", { min: MIN_LEN })}
          </p>
        </div>

        {!tokenFromUrl ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">{t("auth.reset.noTokenTitle")}</p>
            <Button asChild variant="default" className="w-full">
              <Link to="/auth/forgot-password">{t("auth.reset.requestLink")}</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("auth.reset.login")}
              </Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm font-medium">
                {t("auth.reset.newPassword")}
              </Label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70"
                  aria-hidden
                />
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((p) => ({ ...p, password: undefined }));
                  }}
                  autoComplete="new-password"
                  autoFocus
                  disabled={loading}
                  aria-invalid={Boolean(fieldErrors.password)}
                  className={cn(
                    "h-11 pl-10",
                    fieldErrors.password && "border-destructive ring-destructive/20 focus-visible:ring-destructive/30",
                  )}
                />
              </div>
              {fieldErrors.password && (
                <p className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm font-medium">
                {t("auth.reset.confirmPassword")}
              </Label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70"
                  aria-hidden
                />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    setFieldErrors((p) => ({ ...p, confirm: undefined }));
                  }}
                  autoComplete="new-password"
                  disabled={loading}
                  aria-invalid={Boolean(fieldErrors.confirm)}
                  className={cn(
                    "h-11 pl-10",
                    fieldErrors.confirm && "border-destructive ring-destructive/20 focus-visible:ring-destructive/30",
                  )}
                />
              </div>
              {fieldErrors.confirm && (
                <p className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {fieldErrors.confirm}
                </p>
              )}
            </div>

            <Button type="submit" className="h-11 w-full text-base font-semibold shadow-md" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  {t("auth.reset.saving")}
                </>
              ) : (
                t("auth.reset.save")
              )}
            </Button>

            <p className="text-center text-sm">
              <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                {t("auth.reset.backLogin")}
              </Link>
            </p>
          </form>
        )}
      </div>
    </AuthPageShell>
  );
}
