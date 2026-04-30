import { useLocation } from "react-router-dom";

import { buildPayUrl, runtimeConfig } from "../../shared/runtime";
import { appCopy } from "../copy";
import { PrototypeIcon } from "../ui/icons";
import { Skeleton } from "../ui/Skeleton";
import type { AccessStatus, AuthPayload } from "../types";

type PaywallPageProps = {
  auth: AuthPayload | null;
  accessStatus: AccessStatus | null;
};

export function PaywallPage({ auth, accessStatus }: PaywallPageProps) {
  const location = useLocation();
  const payUrl = auth
    ? buildPayUrl(
        `/ru/pay/manage?email=${encodeURIComponent(auth.user.email)}&return_to=${encodeURIComponent(
          `${runtimeConfig.appPublicBaseUrl}${location.pathname}`,
        )}`,
      )
    : buildPayUrl("/ru/pay/manage");

  return (
    <section className="stack-page">
      <div className="page-heading">
        <span className="badge badge--accent">{appCopy.paywall.eyebrow}</span>
        <h1>{appCopy.paywall.title}</h1>
        <p>{appCopy.paywall.body}</p>
      </div>

      {!accessStatus ? <Skeleton lines={4} /> : null}

      <div className="settings-card">
        {appCopy.paywall.bullets.map((item, index) => (
          <div className="settings-row settings-row--static" key={item}>
            <span className="settings-row__icon">
              {index === 0 ? <PrototypeIcon.users /> : index === 1 ? <PrototypeIcon.link /> : index === 2 ? <PrototypeIcon.shield /> : <PrototypeIcon.support />}
            </span>
            <span className="settings-row__body">{item}</span>
          </div>
        ))}
      </div>

      <a className="button button--primary button--lg button--full" href={payUrl}>
        {appCopy.paywall.primaryCta}
      </a>
    </section>
  );
}
