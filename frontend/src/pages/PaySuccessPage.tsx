import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "../features/i18n/I18nProvider";
import { getPaymentOrderStatus, getPaymentSessionStatus, type PaymentStatus } from "../shared/lib/paymentApi";
import { reachYandexMetrikaGoal } from "../shared/lib/yandexMetrika";
import { Container } from "../shared/ui/Container";
import { LanguageSwitcher } from "../shared/ui/LanguageSwitcher";
import { QuizCard } from "../shared/ui/QuizCard";
import { SiteFooter } from "../shared/ui/SiteFooter";

export const PaySuccessPage = () => {
  const { copy } = useI18n();
  const location = useLocation();
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const didTrackPaidRef = useRef(false);

  const orderId = new URLSearchParams(location.search).get("order_id") || "";
  const sessionId = new URLSearchParams(location.search).get("session_id") || "";
  const botUrl =
    window.__APP_CONFIG__?.VITE_TELEGRAM_BOT_URL?.trim() ||
    new URLSearchParams(location.search).get("bot_url") ||
    "";

  useEffect(() => {
    if (!orderId && !sessionId) {
      setError(null);
      setStatus(null);
      return;
    }

    let cancelled = false;
    let timer: number | null = null;

    const pollStatus = async () => {
      try {
        const payload = orderId ? await getPaymentOrderStatus(orderId) : await getPaymentSessionStatus(sessionId);
        if (cancelled) {
          return;
        }

        setStatus(payload);
        setError(null);

        if (payload.payment_status !== "paid") {
          timer = window.setTimeout(pollStatus, 3000);
        }
      } catch {
        if (!cancelled) {
          setError(copy.ui.payError);
          timer = window.setTimeout(pollStatus, 5000);
        }
      }
    };

    void pollStatus();

    return () => {
      cancelled = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [copy.ui.payError, orderId, sessionId]);

  const isPaid = status?.payment_status === "paid";
  const openBotHref = status?.activation_link || botUrl;

  useEffect(() => {
    if (!isPaid || didTrackPaidRef.current) {
      return;
    }
    didTrackPaidRef.current = true;
    reachYandexMetrikaGoal("pay_success");
  }, [isPaid]);

  return (
    <>
      <Container>
        <LanguageSwitcher />
        <QuizCard>
          <h1>{copy.ui.paySuccessTitle}</h1>
          <p className="pay-copy">{isPaid ? copy.ui.paySuccessDone : copy.ui.paySuccessPending}</p>
          {openBotHref ? (
            <a
              className="btn"
              href={openBotHref}
              target="_blank"
              rel="noreferrer"
              onClick={() => reachYandexMetrikaGoal("open_bot")}
            >
              {copy.ui.payOpenBot}
            </a>
          ) : null}
          {isPaid || (!sessionId && !orderId) ? <p className="pay-copy">{copy.ui.payRestoreHint}</p> : null}
          {error ? <p className="pay-error">{error}</p> : null}
        </QuizCard>
      </Container>
      <SiteFooter />
    </>
  );
};
