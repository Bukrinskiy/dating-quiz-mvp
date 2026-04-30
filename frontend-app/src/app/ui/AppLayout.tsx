import type { PropsWithChildren } from "react";
import { Link, NavLink, useLocation, useSearchParams } from "react-router-dom";

import { appCopy, modeCopy } from "../copy";
import { PrototypeIcon } from "./icons";

type AppLayoutProps = PropsWithChildren<{
  onLogout: () => Promise<void>;
}>;

const APP_NAV_ROUTES = [/^\/app$/, /^\/app\/session\/.+$/, /^\/app\/support$/, /^\/paywall$/, /^\/help$/, /^\/app\/profile$/];

export function AppLayout({ children, onLogout }: AppLayoutProps) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const showAppNav = APP_NAV_ROUTES.some((pattern) => pattern.test(location.pathname));
  const sessionWide = /^\/app\/session\//.test(location.pathname);
  const header = resolveHeader(location.pathname, searchParams.get("mode"));
  const navItems = appCopy.tabs;
  const navIcons = {
    "/app": PrototypeIcon.chat,
    "/paywall": PrototypeIcon.lock,
    "/help": PrototypeIcon.helpC,
    "/app/profile": PrototypeIcon.person,
  } as const;

  return (
    <div className={`app-shell${showAppNav ? " app-shell--with-appnav" : ""}${sessionWide ? " app-shell--session-wide" : ""}`}>
      {header ? (
        <header className="app-shell__header">
          <div className="app-shell__header-inner">
            {header.backTo ? (
              <Link aria-label="Назад" className="app-shell__back" to={header.backTo}>
                <PrototypeIcon.back />
              </Link>
            ) : null}
            <div className={`app-shell__brand${header.kind === "home" ? " app-shell__brand--home" : ""}`}>
              {header.kind === "home" ? (
                <img className="app-shell__brand-logo" src="/flirto-logo.png" alt="Flirto Guru" />
              ) : (
                <strong className="app-shell__title">{header.title}</strong>
              )}
            </div>
            <div className="app-shell__header-actions">
              {header.kind === "profile" ? (
                <button className="app-shell__ghost-link" onClick={() => void onLogout()} type="button">
                  Выйти
                </button>
              ) : null}
            </div>
          </div>
          {showAppNav ? (
            <nav className="app-shell__topnav" aria-label="Основная навигация">
              {navItems.map((item) => (
                <NavLink
                  className={() =>
                    `app-shell__topnav-link${isTopNavActive(location.pathname, item.to) ? " is-active" : ""}`
                  }
                  key={item.to}
                  to={item.to}
                >
                  <span aria-hidden="true" className="app-shell__topnav-icon">
                    {(() => {
                      const Icon = navIcons[item.to as keyof typeof navIcons];
                      return <Icon />;
                    })()}
                  </span>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          ) : null}
        </header>
      ) : null}
      <main className={`app-main${showAppNav ? " app-main--with-appnav" : ""}${sessionWide ? " app-main--session-wide" : ""}`}>
        <div className={`app-main__inner${sessionWide ? " app-main__inner--session-wide" : ""}`}>{children}</div>
      </main>
    </div>
  );
}

function resolveHeader(pathname: string, mode: string | null) {
  if (pathname === "/login") {
    return null;
  }
  if (pathname === "/app") {
    return { kind: "home" as const, title: "", backTo: null };
  }
  if (pathname.startsWith("/app/session/")) {
    return { kind: "session" as const, title: mode && mode in modeCopy ? modeCopy[mode as keyof typeof modeCopy].title : "Консультация", backTo: "/app" };
  }
  if (pathname === "/paywall") {
    return { kind: "paywall" as const, title: "Доступ", backTo: "/app" };
  }
  if (pathname === "/app/profile") {
    return { kind: "profile" as const, title: "Профиль", backTo: "/app" };
  }
  if (pathname === "/app/support") {
    return { kind: "support" as const, title: "Поддержка", backTo: "/app/profile" };
  }
  if (pathname === "/help") {
    return { kind: "help" as const, title: "Помощь", backTo: "/app" };
  }
  return { kind: "default" as const, title: "Flirto Guru", backTo: authBackTarget(pathname) };
}

function authBackTarget(pathname: string) {
  return pathname.startsWith("/app") ? "/app" : "/login";
}

function isTopNavActive(pathname: string, target: string) {
  if (target === "/app") {
    return pathname === "/app" || pathname.startsWith("/app/session/");
  }
  return pathname === target;
}
