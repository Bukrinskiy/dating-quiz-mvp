import { useEffect, useMemo, useRef, useState } from "react";

import { asTextList } from "../api";
import { useI18n, type AppMessages } from "../i18n";
import type { SessionGeneratePayload, SessionMode } from "../types";
import { PrototypeIcon, renderResultIcon } from "../ui/icons";
import { BottomSheet } from "../ui/BottomSheet";
import { StepBar } from "../ui/StepBar";

type ResultStageProps = {
  busy: boolean;
  mode: SessionMode;
  payload: SessionGeneratePayload;
  onRefine: (command: string) => Promise<void>;
  readOnly?: boolean;
};

type Field = {
  key: string;
  label: string;
  value: string | string[];
  icon: Parameters<typeof renderResultIcon>[0];
};

export function ResultStage({ busy, mode, payload, onRefine, readOnly = false }: ResultStageProps) {
  const { messages } = useI18n();
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [copied, setCopied] = useState(false);
  const copyResetTimeoutRef = useRef<number | null>(null);
  const heroLabel = mode === "write_now" ? messages.session.resultTitle : messages.session.sceneCollectSubtitle;
  const heroText = String(mode === "write_now" ? payload.primary_message || "" : payload.diagnosis || "");
  const fields = useMemo(() => buildFields(mode, payload, messages), [mode, payload, messages]);

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current !== null) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
    };
  }, []);

  return (
    <section className="result-stage">
      <StepBar step={3} />
      <div className="result-hero">
        <div className="result-hero__top">
          <span>{heroLabel}</span>
          <button
            className="result-hero__copy"
            onClick={async () => {
              if (heroText) {
                await navigator.clipboard?.writeText(heroText);
                setCopied(true);
                if (copyResetTimeoutRef.current !== null) {
                  window.clearTimeout(copyResetTimeoutRef.current);
                }
                copyResetTimeoutRef.current = window.setTimeout(() => {
                  setCopied(false);
                  copyResetTimeoutRef.current = null;
                }, 1000);
              }
            }}
            type="button"
          >
            {copied ? messages.session.copied : (
              <>
                <PrototypeIcon.copy />
                {messages.session.copy}
              </>
            )}
          </button>
        </div>
        <p>{heroText || "—"}</p>
      </div>

      <div className="result-card-list">
        {fields.map((field) => {
          const listValue = Array.isArray(field.value) ? field.value : null;
          return (
            <article className="result-card" key={field.key}>
              <header className="result-card__header">
                <span className="result-card__icon">{renderResultIcon(field.icon)}</span>
                <strong>{field.label}</strong>
              </header>
              {listValue ? (
                listValue.length ? (
                  <ul>
                    {listValue.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>—</p>
                )
              ) : (
                <p>{String(field.value || "—")}</p>
              )}
            </article>
          );
        })}
      </div>

      <div className="result-actions">
        <div className="result-actions__chips">
          {messages.session.refinePresets.map((item) => (
            <button className="chip" disabled={busy || readOnly} key={item} onClick={() => void onRefine(item)} type="button">
              {item}
            </button>
          ))}
        </div>
        <button className="button button--secondary button--lg button--full" disabled={busy || readOnly} onClick={() => setCustomOpen(true)} type="button">
          {messages.session.refineCustom}
        </button>
      </div>

      <BottomSheet open={customOpen} title={messages.session.refineTitle} onClose={() => setCustomOpen(false)}>
        <textarea
          className="sheet-textarea"
          placeholder={messages.session.refinePlaceholder}
          rows={4}
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
        />
        <button
          className="button button--primary button--lg button--full"
          disabled={busy || readOnly || !custom.trim()}
          onClick={async () => {
            await onRefine(custom.trim());
            setCustom("");
            setCustomOpen(false);
          }}
          type="button"
        >
          {messages.session.refineSend}
        </button>
      </BottomSheet>
    </section>
  );
}

function buildFields(mode: SessionMode, payload: SessionGeneratePayload, messages: AppMessages): Field[] {
  if (mode === "write_now") {
    return [
      { key: "why", label: messages.session.cards.why, value: String(payload.why || ""), icon: "why" },
      { key: "risks", label: messages.session.cards.risks, value: asTextList(payload.risks), icon: "risks" },
      { key: "avoid_list", label: messages.session.cards.avoid, value: asTextList(payload.avoid_list), icon: "avoid" },
      { key: "next_step", label: messages.session.cards.nextStep, value: String(payload.next_step || ""), icon: "next" },
      { key: "fallback_simple_version", label: messages.session.cards.simpleVersion, value: String(payload.fallback_simple_version || ""), icon: "simple" },
      { key: "alternatives", label: messages.session.cards.alternatives, value: asTextList(payload.alternatives), icon: "alt" },
    ];
  }

  return [
    { key: "core_leverage", label: messages.session.cards.leverage, value: String(payload.core_leverage || ""), icon: "leverage" },
    { key: "plan_24h", label: messages.session.cards.plan24, value: asTextList(payload.plan_24h), icon: "plan24" },
    { key: "plan_if_reply", label: messages.session.cards.ifReply, value: asTextList(payload.plan_if_reply), icon: "ifReply" },
    { key: "plan_if_no_reply", label: messages.session.cards.ifNoReply, value: asTextList(payload.plan_if_no_reply), icon: "ifNoReply" },
    { key: "message_template", label: messages.session.cards.template, value: String(payload.message_template || ""), icon: "template" },
    { key: "avoid_list", label: messages.session.cards.avoid, value: asTextList(payload.avoid_list), icon: "avoid" },
  ];
}
