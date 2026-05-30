import { Link } from "react-router-dom";

import { legalDocuments } from "../../../../shared/legal/documents";
import { PrototypeIcon } from "./icons";

type AppLegalLinksProps = {
  className?: string;
};

const legalLinkItems = [
  {
    key: "terms",
    to: "/legal/terms",
    title: legalDocuments.terms.title,
    subtitle: "Service rules and user responsibilities",
    icon: <PrototypeIcon.shield />,
  },
  {
    key: "privacy",
    to: "/legal/privacy",
    title: legalDocuments.privacy.title,
    subtitle: "What data we collect and how we use it",
    icon: <PrototypeIcon.lock />,
  },
  {
    key: "refund",
    to: "/legal/refund",
    title: legalDocuments.refund.title,
    subtitle: "When refunds can be reviewed",
    icon: <PrototypeIcon.card />,
  },
] as const;

export function AppLegalLinks({ className = "" }: AppLegalLinksProps) {
  return (
    <nav aria-label="Legal links" className={`app-legal-links ${className}`.trim()}>
      {legalLinkItems.map((item) => (
        <Link className="settings-row settings-row--link app-legal-links__row" key={item.key} to={item.to}>
          <span className="settings-row__icon app-legal-links__icon">{item.icon}</span>
          <span className="settings-row__main">
            <strong>{item.title}</strong>
            <span>{item.subtitle}</span>
          </span>
          <span className="settings-row__chevron"><PrototypeIcon.chevron /></span>
        </Link>
      ))}
    </nav>
  );
}
