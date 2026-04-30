import { Spinner } from "@radix-ui/themes";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { type PaymentStatus, getPaymentOrderStatus, getPaymentSessionStatus } from "../../shared/api/paymentApi";
import { quizCheckoutContent } from "../../features/checkout-content/newCheckoutContent";
import { useI18n } from "../../features/i18n/useI18n";
import { addClickIdToPath } from "../../entities/tracking-attribution/model";
import { DEFAULT_QUIZ_LANG, isQuizLang, payRoutes } from "../../shared/config/routes";
import { flirtoLogoSrc } from "../../shared/branding/flirtoLogo";
import { reachYandexMetrikaGoal } from "../../shared/lib/yandexMetrika";
import { BrandHomeLink } from "../../shared/ui/BrandHomeLink";
import { SiteFooter } from "../../shared/ui/SiteFooter";

export const SuccessPage = () => {
  const { copy } = useI18n();
  const location = useLocation();
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const didTrackPaidRef = useRef(false);
  const pollAttemptsRef = useRef(0);

  const orderId = new URLSearchParams(location.search).get("order_id") || "";
  const sessionId = new URLSearchParams(location.search).get("session_id") || "";
  const pathLang = location.pathname.split("/")[1];
  const lang = isQuizLang(pathLang) ? pathLang : DEFAULT_QUIZ_LANG;
  const localizedCheckout = quizCheckoutContent[lang].checkout;

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
        pollAttemptsRef.current += 1;

        const isAwaitingActivationLink = payload.payment_status === "paid" && !payload.activation_link && pollAttemptsRef.current < 20;
        if (payload.payment_status !== "paid" || isAwaitingActivationLink) {
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
  const hasActivationLink = Boolean(status?.activation_link);
  const isPendingStatus = Boolean(orderId || sessionId) && (!isPaid || !hasActivationLink);
  const openBotHref = status?.activation_link || "";
  const retryPayHref = addClickIdToPath(payRoutes.checkout(lang, sessionId), location.search);

  useEffect(() => {
    if (!isPaid || didTrackPaidRef.current) {
      return;
    }
    didTrackPaidRef.current = true;
    reachYandexMetrikaGoal("pay_success");
  }, [isPaid]);

  return (
    <main className="source-success">
      <section className="source-success__container">
        <div className="source-success__topbar">
          <BrandHomeLink className="source-success__logo-link" ariaLabel={localizedCheckout.goHomeAria}>
            <img src={flirtoLogoSrc} alt="Flirto Guru" />
          </BrandHomeLink>
        </div>
        <section className="source-success__card">
          <div className="source-success__icon-wrap">
            <img src="/icons/checkout/affemity-funnel-checkout/green-check-mark.svg" alt="" />
          </div>
          <h1>{copy.ui.paySuccessTitle}</h1>
          {isPendingStatus ? (
            <div className="source-success__pending" role="status" aria-live="polite">
              <span className="source-success__pending-spinner" aria-hidden="true">
                <Spinner size="3" />
              </span>
              <span>{copy.ui.paySuccessPending}</span>
            </div>
          ) : (
            <p className="source-success__copy">{copy.ui.paySuccessDone}</p>
          )}
          <div className="source-success__actions">
            {openBotHref ? (
              <a
                className="source-success__action-btn"
                href={openBotHref}
                target="_blank"
                rel="noreferrer"
                onClick={() => reachYandexMetrikaGoal("open_bot")}
              >
                {copy.ui.payOpenBot}
              </a>
            ) : (
              <>
                {isPendingStatus ? (
                  <button className="source-success__action-btn" type="button" disabled aria-disabled="true">
                    {copy.ui.paySuccessPending}
                  </button>
                ) : null}
                {!isPendingStatus && sessionId ? (
                  <Link className="source-success__action-link" to={retryPayHref}>
                    {copy.ui.payStart}
                  </Link>
                ) : null}
              </>
            )}
          </div>
          {(isPaid || (!sessionId && !orderId)) ? <p className="source-success__hint">{copy.ui.payRestoreHint}</p> : null}
          {error ? <p className="source-manage__error">{error}</p> : null}
        </section>
        <SiteFooter variant="checkout" />
      </section>
    </main>
  );
};
