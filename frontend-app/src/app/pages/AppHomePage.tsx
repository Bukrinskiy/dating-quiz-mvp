import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { createAppApi } from "../api";
import { resolveStatusLabel } from "../access-status";
import { useI18n } from "../i18n";
import type { AppMessages } from "../i18n";
import {
  readRecentSessions,
} from "../local-state";
import type { AccessStatus, AppAuthApi, SessionListItem } from "../types";
import { PrototypeIcon } from "../ui/icons";

const RECENT_SESSIONS_LIMIT = 10;

type AppHomePageProps = {
  authApi: AppAuthApi;
  accessStatus: AccessStatus | null;
  onStartMode: () => Promise<string>;
};

export function AppHomePage({ authApi, accessStatus, onStartMode }: AppHomePageProps) {
  const navigate = useNavigate();
  const { messages } = useI18n();
  const [busy, setBusy] = useState(false);
  const [recentSessions, setRecentSessions] = useState<SessionListItem[]>([]);
  const statusCode = accessStatus?.access_status || authApi.auth?.access.access_status || "active";
  const statusLabel = resolveStatusLabel(accessStatus ?? authApi.auth?.access ?? null);
  const api = useMemo(
    () =>
      createAppApi({
        getAccessToken: () => authApi.auth?.tokens.access_token ?? null,
        refreshAuth: authApi.refreshAuth,
      }),
    [authApi],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = normalizeRecentSessions(await api.listSessions());
        if (!cancelled) {
          setRecentSessions(next);
        }
      } catch {
        if (!cancelled) {
          setRecentSessions(
            normalizeRecentSessions(
              readRecentSessions().map((item) => ({
                session_id: item.id,
                mode: item.mode,
                status: "active",
                state: "collecting_context",
                created_at: item.createdAt,
                updated_at: item.createdAt,
                preview: item.preview,
              })),
            ),
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  return (
    <section className="home-page">
      <div className="home-page__header">
        <div>
          <h1>{messages.home.startConsultation}</h1>
        </div>
      </div>

      <button
        className="mode-card mode-card--single"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const sessionId = await onStartMode();
            navigate(`/app/session/${sessionId}?mode=analyze_case`);
          } finally {
            setBusy(false);
          }
        }}
        type="button"
      >
        <span aria-hidden="true" className="mode-card__glow mode-card__glow--top" />
        <span aria-hidden="true" className="mode-card__glow mode-card__glow--side" />
        <span className="mode-card__icon mode-card__icon--analyze_case">
          <PrototypeIcon.sparkle color="currentColor" />
        </span>
        <strong>{messages.home.startCta}</strong>
        <span className="mode-card__subtitle">{messages.home.startBody}</span>
        {busy ? <em>{messages.home.opening}</em> : null}
      </button>

      {statusLabel === "Active" && (statusCode === "grace_period" || statusCode === "token_issued") && (
        <Link className={`access-banner access-banner--${statusCode}`} to="/paywall">
          <strong>{messages.access[statusCode].title}</strong>
          <p>{messages.access[statusCode].body}</p>
          <span>{messages.access[statusCode].cta}</span>
        </Link>
      )}

      <section className="recent-panel">
        <div className="section-label">{messages.home.recentTitle}</div>
        <div className="recent-list">
          {recentSessions.length ? (
            recentSessions.map((item) => (
              <button
                className="recent-item"
                key={item.session_id}
                onClick={() => navigate(`/app/session/${item.session_id}?mode=${item.mode}`)}
                type="button"
              >
                <span className={`recent-item__icon recent-item__icon--${item.mode}`}>
                  {item.mode === "write_now" ? <PrototypeIcon.pencil color="var(--accent)" /> : <PrototypeIcon.compass color="var(--accent)" />}
                </span>
                <span className="recent-item__copy">
                  <strong>{buildRecentTitle(item.preview, messages)}</strong>
                  <span>{item.preview || messages.home.recentFallbackPreview}</span>
                </span>
                <span className="recent-item__meta">
                  <span>{formatTimeAgo(item.updated_at, messages)}</span>
                  <span aria-hidden="true">
                    <PrototypeIcon.chevron />
                  </span>
                </span>
              </button>
            ))
          ) : (
            <div className="recent-empty">
              <strong>{messages.home.recentEmptyTitle}</strong>
              <p>{messages.home.recentEmptyBody}</p>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}

function formatTimeAgo(value: string, messages: AppMessages) {
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.max(1, Math.floor(diff / (1000 * 60 * 60)));
  if (hours < 24) {
    return `${hours} ${messages.home.hoursAgo}`;
  }
  const days = Math.floor(hours / 24);
  return `${days} ${messages.home.daysAgo}`;
}

function buildRecentTitle(preview: string, messages: AppMessages) {
  const cleanPreview = preview.trim().replace(/\s+/g, " ");
  if (!cleanPreview) {
    return messages.session.sceneCollectSubtitle;
  }
  if (cleanPreview.length <= 52) {
    return cleanPreview;
  }
  return `${cleanPreview.slice(0, 49).trimEnd()}...`;
}

function normalizeRecentSessions(items: SessionListItem[]) {
  return [...items]
    .sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime())
    .slice(0, RECENT_SESSIONS_LIMIT);
}
