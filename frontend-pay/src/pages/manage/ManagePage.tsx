import { useState } from "react";
import { createCustomerPortal } from "../../shared/api/paymentApi";
import { useI18n } from "../../features/i18n/useI18n";
import { flirtoLogoSrc } from "../../shared/branding/flirtoLogo";
import { BrandHomeLink } from "../../shared/ui/BrandHomeLink";
import { SiteFooter } from "../../shared/ui/SiteFooter";

export const ManagePage = () => {
  const { copy } = useI18n();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onOpenPortal = async () => {
    if (!email.trim()) {
      setError(copy.ui.payError);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const payload = await createCustomerPortal(email.trim());
      window.location.href = payload.portal_url;
    } catch {
      setError(copy.ui.payError);
      setLoading(false);
    }
  };

  return (
    <main className="source-success">
      <section className="source-success__container">
        <div className="source-success__topbar">
          <BrandHomeLink className="source-success__logo-link" ariaLabel="Go home">
            <img src={flirtoLogoSrc} alt="Flirto Guru" />
          </BrandHomeLink>
        </div>
        <section className="source-success__card source-manage__card">
          <h1>{copy.ui.payManageTitle}</h1>
          <div className="source-manage__form">
            <label className="source-manage__label" htmlFor="manage-email">
              {copy.ui.payEmailLabel}
            </label>
            <div className="source-email__input-wrap">
              <img src="/icons/email/email-affemity-funnel/email-input-img.svg" alt="" />
              <input
                id="manage-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={copy.ui.payEmailPlaceholder}
                autoComplete="email"
              />
            </div>
            <button className="source-success__action-btn" type="button" onClick={onOpenPortal} disabled={loading}>
              {loading ? copy.ui.payStarting : copy.ui.payManageButton}
            </button>
            {error ? <p className="source-manage__error">{error}</p> : null}
          </div>
        </section>
        <SiteFooter variant="checkout" />
      </section>
    </main>
  );
};
