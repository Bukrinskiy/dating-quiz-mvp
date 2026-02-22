import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "../features/i18n/I18nProvider";
import { getPaymentSessionStatus, type PaymentSessionStatus } from "../shared/lib/paymentApi";
import { Container } from "../shared/ui/Container";
import { LanguageSwitcher } from "../shared/ui/LanguageSwitcher";
import { QuizCard } from "../shared/ui/QuizCard";
import { SiteFooter } from "../shared/ui/SiteFooter";

export const PaySuccessPage = () => {
  const { copy } = useI18n();
  const location = useLocation();
  const [status, setStatus] = useState<PaymentSessionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionId = new URLSearchParams(location.search).get("session_id") || "";

  useEffect(() => {
    if (!sessionId) {
      setError(copy.ui.payError);
      return;
    }

    let cancelled = false;
    let timer: number | null = null;

    const pollStatus = async () => {
      try {
        const payload = await getPaymentSessionStatus(sessionId);
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
  }, [copy.ui.payError, sessionId]);

  const isPaid = status?.payment_status === "paid";

  return (
    <>
      <Container>
        <LanguageSwitcher />
        <QuizCard>
          <h1>{copy.ui.paySuccessTitle}</h1>
          <p className="pay-copy">{isPaid ? copy.ui.paySuccessDone : copy.ui.paySuccessPending}</p>
          {status?.activation_link ? (
            <a className="btn" href={status.activation_link} target="_blank" rel="noreferrer">
              {copy.ui.payOpenBot}
            </a>
          ) : null}
          {isPaid ? <p className="pay-copy">{copy.ui.payRestoreHint}</p> : null}
          {error ? <p className="pay-error">{error}</p> : null}
        </QuizCard>
      </Container>
      <SiteFooter />
    </>
  );
};
