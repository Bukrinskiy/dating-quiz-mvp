import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { appCopy } from "../copy";
import { useSession } from "../hooks/useSession";
import { useToast } from "../hooks/useToast";
import { rememberRecentSession, updateRecentSessionPreview } from "../local-state";
import { ChatScreen } from "../session/ChatScreen";
import { RoleMetaSheet } from "../session/RoleMetaSheet";
import type { AppAuthApi, RoleMeta, SessionMode } from "../types";
import { BottomSheet } from "../ui/BottomSheet";

type SessionPageProps = {
  authApi: AppAuthApi;
};

const DEFAULT_META: RoleMeta = {
  role: "USER_SELF",
  display_name: "",
  sent_at: "",
};

export function SessionPage({ authApi }: SessionPageProps) {
  const navigate = useNavigate();
  const { sessionId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const [meta, setMeta] = useState<RoleMeta>(DEFAULT_META);
  const [metaOpen, setMetaOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { push } = useToast();
  const mode = (searchParams.get("mode") || "analyze_case") as SessionMode;
  const handleForbidden = useCallback(() => navigate("/app", { replace: true }), [navigate]);
  const handleRestartSession = useCallback(
    (nextSessionId: string) => navigate(`/app/session/${nextSessionId}?mode=${mode}`, { replace: true }),
    [mode, navigate],
  );
  const handleToast = useCallback(
    ({ message, tone, action }: { message: string; tone?: "default" | "error" | "warning" | "success"; action?: { label: string; onClick: () => void | Promise<void> } }) =>
      push({ message, tone: tone || "warning", action }),
    [push],
  );

  const session = useSession({
    sessionId,
    mode,
    authApi,
    trackThinking: (promise) => promise,
    onForbidden: handleForbidden,
    onRestartSession: handleRestartSession,
    onToast: handleToast,
  });

  useEffect(() => {
    rememberRecentSession(sessionId, mode);
  }, [mode, sessionId]);

  useEffect(() => {
    if (session.generated) {
      updateRecentSessionPreview(sessionId, session.generated.ui_payload);
    }
  }, [session.generated, sessionId]);

  return (
    <section className={`session-page session-page--${session.stage}`}>
      <div className={`stage-frame stage-frame--${session.stage}`}>
        <ChatScreen
          busy={session.busy || session.readOnly}
          deletingMessageId={session.deletingMessageId}
          generated={session.generated?.ui_payload ?? null}
          generating={session.finalizing}
          hasAssets={session.hasAssets}
          messages={session.messages}
          meta={meta}
          onAudioDenied={() => push({ message: appCopy.session.microphoneDenied, tone: "warning" })}
          onCloseBatch={session.actions.finalizeBatch}
          onDeleteMessage={(messageId) => session.actions.deleteMessage(messageId)}
          onOpenRoleMeta={() => setMetaOpen(true)}
          onSendAudio={(file) => session.actions.uploadMedia("audio", file, meta)}
          onSendImage={(file) => session.actions.uploadMedia("image", file, meta)}
          onSendText={(text, nextMeta) => session.actions.sendText({ text, meta: nextMeta })}
        />
      </div>
      <RoleMetaSheet open={metaOpen} value={meta} onApply={setMeta} onClose={() => setMetaOpen(false)} />
      <BottomSheet open={menuOpen} title={appCopy.session.sessionMenu} onClose={() => setMenuOpen(false)}>
        <div className="sheet-choice-grid">
          <button
            className="button button--secondary button--lg button--full"
            onClick={() => {
              setMenuOpen(false);
              setMetaOpen(true);
            }}
            type="button"
          >
            {appCopy.session.roleTitle}
          </button>
          <button
            className="button button--danger button--lg button--full"
            onClick={async () => {
              setMenuOpen(false);
              const approved = window.confirm(`${appCopy.session.sessionExitTitle}\n\n${appCopy.session.sessionExitBody}`);
              if (!approved) {
                return;
              }
              await session.actions.reset();
              navigate("/app");
            }}
            type="button"
          >
            {appCopy.session.resetSession}
          </button>
        </div>
      </BottomSheet>
    </section>
  );
}
