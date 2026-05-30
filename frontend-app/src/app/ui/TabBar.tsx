import { NavLink, useLocation } from "react-router-dom";

import { useI18n } from "../i18n";
import { resolveAdviceTabTarget } from "../local-state";
import { PrototypeIcon } from "./icons";

export function TabBar() {
  const location = useLocation();
  const { messages } = useI18n();
  const adviceTarget = resolveAdviceTabTarget();
  const items = [
    {
      to: adviceTarget,
      label: messages.tabs[0].label,
      icon: PrototypeIcon.chat,
      isActive: (pathname: string) => pathname === "/app" || pathname.startsWith("/app/session/"),
    },
    { to: "/paywall", label: messages.tabs[1].label, icon: PrototypeIcon.lock, isActive: (pathname: string) => pathname === "/paywall" },
    { to: "/help", label: messages.tabs[2].label, icon: PrototypeIcon.helpC, isActive: (pathname: string) => pathname === "/help" },
    { to: "/app/profile", label: messages.tabs[3].label, icon: PrototypeIcon.person, isActive: (pathname: string) => pathname === "/app/profile" },
  ] as const;

  return (
    <nav className="tabbar" aria-label={messages.brand.name}>
      {items.map((item) => (
        <NavLink className={`tabbar__item${item.isActive(location.pathname) ? " is-active" : ""}`} end key={item.label} to={item.to}>
          <span aria-hidden="true" className="tabbar__icon">
            <item.icon />
          </span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
