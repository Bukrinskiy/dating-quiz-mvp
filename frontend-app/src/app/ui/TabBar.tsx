import { NavLink, useLocation } from "react-router-dom";

import { resolveAdviceTabTarget } from "../local-state";
import { PrototypeIcon } from "./icons";

export function TabBar() {
  const location = useLocation();
  const adviceTarget = resolveAdviceTabTarget();
  const items = [
    {
      to: adviceTarget,
      label: "Совет",
      icon: PrototypeIcon.chat,
      isActive: (pathname: string) => pathname === "/app" || pathname.startsWith("/app/session/"),
    },
    { to: "/paywall", label: "Доступ", icon: PrototypeIcon.lock, isActive: (pathname: string) => pathname === "/paywall" },
    { to: "/help", label: "Помощь", icon: PrototypeIcon.helpC, isActive: (pathname: string) => pathname === "/help" },
    { to: "/app/profile", label: "Профиль", icon: PrototypeIcon.person, isActive: (pathname: string) => pathname === "/app/profile" },
  ] as const;

  return (
    <nav className="tabbar" aria-label="Основная навигация">
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
