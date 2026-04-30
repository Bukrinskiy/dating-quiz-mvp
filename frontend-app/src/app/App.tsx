import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";

import { createAppApi } from "./api";
import { appCopy } from "./copy";
import { AccessStatusProvider, useAccessStatus } from "./hooks/useAccessStatus";
import { ThinkingProvider } from "./hooks/useThinking";
import { ToastProvider, useToast } from "./hooks/useToast";
import { AppHomePage } from "./pages/AppHomePage";
import { LoginPage } from "./pages/LoginPage";
import { PaywallPage } from "./pages/PaywallPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SessionPage } from "./pages/SessionPage";
import { StaticPage } from "./pages/StaticPage";
import { SupportChatPage } from "./pages/SupportChatPage";
import type { AppAuthApi, AuthPayload, SessionMode } from "./types";
import { AppLayout } from "./ui/AppLayout";
import { apiFetch } from "./api";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { readTheme, rememberRecentSession, type AppTheme, writeTheme } from "./local-state";

export function App() {
  const [auth, setAuth] = useState<AuthPayload | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [offlineBoot, setOfflineBoot] = useState(false);
  const [theme, setTheme] = useState<AppTheme>(() => readTheme());

  const refreshAuth = async (): Promise<AuthPayload | null> => {
    const response = await apiFetch("/api/app/auth/refresh", { method: "POST" });
    if (!response.ok) {
      setAuth(null);
      return null;
    }
    const payload = (await response.json()) as AuthPayload;
    setAuth(payload);
    return payload;
  };

  useEffect(() => {
    void (async () => {
      try {
        await refreshAuth();
        setOfflineBoot(false);
      } catch {
        setOfflineBoot(true);
      }
      setBootstrapping(false);
    })();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    writeTheme(theme);
  }, [theme]);

  const authApi = useMemo<AppAuthApi>(
    () => ({
      auth,
      setAuth,
      refreshAuth,
      logout: async () => {
        await apiFetch("/api/app/auth/logout", { method: "POST" });
        setAuth(null);
      },
    }),
    [auth],
  );

  if (bootstrapping) {
    return <div className="app-boot">{appCopy.shell.boot}</div>;
  }

  if (offlineBoot && !auth) {
    return (
      <div className="app-boot">
        <Card className="offline-card" padding="lg" tone="strong">
          <h1>{appCopy.offline.title}</h1>
          <p>{appCopy.offline.body}</p>
          <Button
            onClick={async () => {
              setBootstrapping(true);
              try {
                await refreshAuth();
                setOfflineBoot(false);
              } catch {
                setOfflineBoot(true);
              } finally {
                setBootstrapping(false);
              }
            }}
          >
            {appCopy.shell.retry}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <ToastProvider>
      <ThinkingProvider>
        <AccessStatusProvider authApi={authApi}>
          <AppRoutes authApi={authApi} theme={theme} onThemeChange={setTheme} />
        </AccessStatusProvider>
      </ThinkingProvider>
    </ToastProvider>
  );
}

function AppRoutes({
  authApi,
  theme,
  onThemeChange,
}: {
  authApi: AppAuthApi;
  theme: AppTheme;
  onThemeChange: (value: AppTheme) => void;
}) {
  const { status } = useAccessStatus();
  const { push } = useToast();
  const navigate = useNavigate();
  const api = useMemo(
    () =>
      createAppApi({
        getAccessToken: () => authApi.auth?.tokens.access_token ?? null,
        refreshAuth: authApi.refreshAuth,
      }),
    [authApi],
  );

  const startMode = async () => {
    const mode: SessionMode = "analyze_case";
    const payload = await api.startSession(mode);
    rememberRecentSession(payload.session_id, mode);
    return payload.session_id;
  };

  return (
    <AppLayout onLogout={authApi.logout}>
      <Routes>
        <Route path="/" element={<Navigate to={authApi.auth ? (authApi.auth.access.has_access ? "/app" : "/paywall") : "/login"} replace />} />
        <Route
          path="/login"
          element={
            <LoginPage
              authApi={authApi}
              onRequestCode={(email) => api.requestCode(email).then(() => undefined)}
              onConfirmCode={async (email, code) => {
                const payload = await api.confirmCode(email, code);
                authApi.setAuth(payload);
                navigate(payload.access.has_access ? "/app" : "/paywall", { replace: true });
              }}
            />
          }
        />
        <Route path="/paywall" element={<RequireAuth auth={authApi.auth}><PaywallPage accessStatus={status} auth={authApi.auth} /></RequireAuth>} />
        <Route
          path="/app"
          element={<RequirePaid auth={authApi.auth}><AppHomePage accessStatus={status} authApi={authApi} onStartMode={startMode} /></RequirePaid>}
        />
        <Route path="/app/session/:sessionId" element={<RequirePaid auth={authApi.auth}><SessionPage authApi={authApi} /></RequirePaid>} />
        <Route
          path="/app/support"
          element={
            <RequireAuth auth={authApi.auth}>
              <SupportChatPage
                authApi={authApi}
                onSubmit={async (text) => {
                  await api.submitSupport(text);
                  push({ message: appCopy.support.success, tone: "success" });
                }}
              />
            </RequireAuth>
          }
        />
        <Route path="/app/support-chat" element={<Navigate replace to="/app/support" />} />
        <Route
          path="/app/profile"
          element={
            <RequireAuth auth={authApi.auth}>
              <ProfilePage
                authApi={authApi}
                onThemeChange={onThemeChange}
                theme={theme}
              />
            </RequireAuth>
          }
        />
        <Route path="/help" element={<StaticPage kind="help" />} />
        <Route path="/premium" element={<StaticPage kind="premium" />} />
      </Routes>
    </AppLayout>
  );
}

function RequireAuth({ auth, children }: { auth: AuthPayload | null; children: ReactElement }) {
  return auth ? children : <Navigate to="/login" replace />;
}

function RequirePaid({ auth, children }: { auth: AuthPayload | null; children: ReactElement }) {
  if (!auth) {
    return <Navigate to="/login" replace />;
  }
  if (!auth.access.has_access) {
    return <Navigate to="/paywall" replace />;
  }
  return children;
}
