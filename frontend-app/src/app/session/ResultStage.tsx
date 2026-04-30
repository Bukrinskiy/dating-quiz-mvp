import { useEffect, useMemo, useRef, useState } from "react";

import { asTextList } from "../api";
import { appCopy } from "../copy";
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
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [copied, setCopied] = useState(false);
  const copyResetTimeoutRef = useRef<number | null>(null);
  const heroLabel = mode === "write_now" ? "Готовый ответ" : "Разбор ситуации";
  const heroText = String(mode === "write_now" ? payload.primary_message || "" : payload.diagnosis || "");
  const fields = useMemo(() => buildFields(mode, payload), [mode, payload]);

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
            {copied ? appCopy.session.copied : (
              <>
                <PrototypeIcon.copy />
                {appCopy.session.copy}
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
          {appCopy.session.refinePresets.map((item) => (
            <button className="chip" disabled={busy || readOnly} key={item} onClick={() => void onRefine(item)} type="button">
              {item}
            </button>
          ))}
        </div>
        <button className="button button--secondary button--lg button--full" disabled={busy || readOnly} onClick={() => setCustomOpen(true)} type="button">
          {appCopy.session.refineCustom}
        </button>
      </div>

      <BottomSheet open={customOpen} title={appCopy.session.refineTitle} onClose={() => setCustomOpen(false)}>
        <textarea
          className="sheet-textarea"
          placeholder={appCopy.session.refinePlaceholder}
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
          {appCopy.session.refineSend}
        </button>
      </BottomSheet>
    </section>
  );
}

function buildFields(mode: SessionMode, payload: SessionGeneratePayload): Field[] {
  if (mode === "write_now") {
    return [
      { key: "why", label: appCopy.session.cards.why, value: String(payload.why || ""), icon: "why" },
      { key: "risks", label: appCopy.session.cards.risks, value: asTextList(payload.risks), icon: "risks" },
      { key: "avoid_list", label: appCopy.session.cards.avoid, value: asTextList(payload.avoid_list), icon: "avoid" },
      { key: "next_step", label: appCopy.session.cards.nextStep, value: String(payload.next_step || ""), icon: "next" },
      { key: "fallback_simple_version", label: appCopy.session.cards.simpleVersion, value: String(payload.fallback_simple_version || ""), icon: "simple" },
      { key: "alternatives", label: appCopy.session.cards.alternatives, value: asTextList(payload.alternatives), icon: "alt" },
    ];
  }

  return [
    { key: "core_leverage", label: appCopy.session.cards.leverage, value: String(payload.core_leverage || ""), icon: "leverage" },
    { key: "plan_24h", label: appCopy.session.cards.plan24, value: asTextList(payload.plan_24h), icon: "plan24" },
    { key: "plan_if_reply", label: appCopy.session.cards.ifReply, value: asTextList(payload.plan_if_reply), icon: "ifReply" },
    { key: "plan_if_no_reply", label: appCopy.session.cards.ifNoReply, value: asTextList(payload.plan_if_no_reply), icon: "ifNoReply" },
    { key: "message_template", label: appCopy.session.cards.template, value: String(payload.message_template || ""), icon: "template" },
    { key: "avoid_list", label: appCopy.session.cards.avoid, value: asTextList(payload.avoid_list), icon: "avoid" },
  ];
}
