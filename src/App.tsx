import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LocaleProvider } from "@/lib/locale";
import { AuthGuard } from "@/components/AuthGuard";
import { PermissionRoute } from "@/components/PermissionRoute";
import { UserDetailRouteGuard } from "@/components/UserDetailRouteGuard";
import AdminLayout from "@/components/AdminLayout";
import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import MissionsPage from "@/pages/MissionsPage";
import MissionDetailPage from "@/pages/MissionDetailPage";
import EstablishmentsPage from "@/pages/EstablishmentsPage";
import ExceptionsPage from "@/pages/ExceptionsPage";
import UsersPage from "@/pages/UsersPage";
import AuditPage from "@/pages/AuditPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";
import CreateMissionPage from "@/pages/CreateMissionPage";
import CreateEstablishmentPage from "@/pages/CreateEstablishmentPage";
import RolesPage from "@/pages/RolesPage";
import RegisterUserPage from "@/pages/RegisterUserPage";
import EstablishmentDetailPage from "@/pages/EstablishmentDetailPage";
import ObservabilityPage from "@/pages/ObservabilityPage";
import { ObservabilityProvider } from "@/lib/observability/ObservabilityProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/auth/forgot-password"
        element={isAuthenticated ? <Navigate to="/" replace /> : <ForgotPasswordPage />}
      />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

      {!isAuthenticated ? (
        <Route path="*" element={<Navigate to="/login" replace />} />
      ) : (
        <>
          <Route
            element={
              <AuthGuard>
                <AdminLayout />
              </AuthGuard>
            }
          >
        <Route path="/" element={<DashboardPage />} />
        <Route
          path="/missions"
          element={
            <PermissionRoute permission="MISSION_READ">
              <MissionsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/missions/new"
          element={
            <PermissionRoute permission="MISSION_CREATE">
              <CreateMissionPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/missions/:id"
          element={
            <PermissionRoute permission="MISSION_READ">
              <MissionDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/etablissements"
          element={
            <PermissionRoute permission="ESTABLISHMENT_READ">
              <EstablishmentsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/etablissements/new"
          element={
            <PermissionRoute permission="ESTABLISHMENT_CREATE">
              <CreateEstablishmentPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/etablissements/:id"
          element={
            <PermissionRoute permission="ESTABLISHMENT_READ">
              <EstablishmentDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/signalements"
          element={
            <PermissionRoute permission="EXCEPTION_READ">
              <ExceptionsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/utilisateurs"
          element={
            <PermissionRoute permission="USER_LIST">
              <UsersPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/utilisateurs/nouveau"
          element={
            <PermissionRoute permission="AUTH_REGISTER_USER">
              <RegisterUserPage />
            </PermissionRoute>
          }
        />
        <Route path="/utilisateurs/:id" element={<UserDetailRouteGuard />} />
        <Route
          path="/roles"
          element={
            <PermissionRoute rolesOnly={["SUPER_ADMIN", "NATIONAL_ADMIN"]}>
              <RolesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/pilotage"
          element={
            <PermissionRoute permission="REPORT_READ">
              <ReportsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/audit"
          element={
            <PermissionRoute permission="AUDIT_READ">
              <AuditPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/observabilite"
          element={
            <PermissionRoute permission="TELEMETRY_READ">
              <ObservabilityPage />
            </PermissionRoute>
          }
        />
        <Route path="/parametres" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </>
      )}
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <LocaleProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-center" richColors closeButton />
          <BrowserRouter>
            <AuthProvider>
              <ObservabilityProvider>
                <AppRoutes />
              </ObservabilityProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </LocaleProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
