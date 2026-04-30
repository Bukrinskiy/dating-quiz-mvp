import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { appCopy } from "../copy";
import type { AppAuthApi } from "../types";

type LoginPageProps = {
  authApi: AppAuthApi;
  onRequestCode: (email: string) => Promise<void>;
  onConfirmCode: (email: string, code: string) => Promise<void>;
};

export function LoginPage({ authApi, onRequestCode, onConfirmCode }: LoginPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (authApi.auth) {
      navigate(authApi.auth.access.has_access ? "/app" : "/paywall", { replace: true });
    }
  }, [authApi.auth, navigate]);

  return (
    <section className="login-page">
      <div className="login-page__brand">
        <img src="/flirto-logo.png" alt="Flirto Guru" />
      </div>
      <div className="login-page__stack">
        <div className="login-page__copy">
          <h1>{appCopy.login.title}</h1>
        </div>

        <label className="field">
          <span>{appCopy.login.emailLabel}</span>
          <input autoComplete="email" placeholder={appCopy.login.emailPlaceholder} type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>

        {step === "code" ? (
          <label className="field">
            <span>{appCopy.login.codeLabel}</span>
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              placeholder={appCopy.login.codePlaceholder}
              type="tel"
              value={code}
              onChange={(event) => setCode(event.target.value.slice(0, 6))}
            />
          </label>
        ) : null}

        {status ? <p className="inline-status is-visible">{status}</p> : null}
        {busy && step === "email" ? (
          <div className="login-page__loading" role="status" aria-live="polite">
            <span aria-hidden="true" className="login-page__spinner" />
          </div>
        ) : null}

        {step === "email" ? (
          <button
            className="button button--primary button--lg button--full"
            disabled={busy || !email.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await onRequestCode(email.trim());
                setStep("code");
                setStatus(appCopy.login.requestSuccess);
              } catch {
                setStatus(appCopy.login.requestError);
              } finally {
                setBusy(false);
              }
            }}
            type="button"
          >
            {appCopy.login.requestCode}
          </button>
        ) : (
          <div className="login-page__actions">
            <button
              className="button button--primary button--lg button--full"
              disabled={busy || code.trim().length !== 6}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirmCode(email.trim(), code.trim());
                } catch {
                  setStatus(appCopy.login.confirmError);
                } finally {
                  setBusy(false);
                }
              }}
              type="button"
            >
              {appCopy.login.confirmCode}
            </button>
            <button
              className="button button--secondary button--lg button--full"
              disabled={busy}
              onClick={() => {
                setStep("email");
                setCode("");
                setStatus("");
              }}
              type="button"
            >
              {appCopy.login.resendCode}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
