import type { PropsWithChildren } from "react";
import { Link, NavLink, useLocation, useSearchParams } from "react-router-dom";

import { useI18n, type AppMessages, type ModeMessages } from "../i18n";
import { PrototypeIcon } from "./icons";

type AppLayoutProps = PropsWithChildren<{
  isAuthenticated?: boolean;
  onLogout: () => Promise<void>;
}>;

const APP_NAV_ROUTES = [/^\/app$/, /^\/app\/session\/.+$/, /^\/app\/support$/, /^\/paywall$/, /^\/help$/, /^\/app\/profile$/];

export function AppLayout({ children, isAuthenticated = false, onLogout }: AppLayoutProps) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { messages, modeMessages } = useI18n();
  const showAppNav = APP_NAV_ROUTES.some((pattern) => pattern.test(location.pathname));
  const sessionWide = /^\/app\/session\//.test(location.pathname);
  const header = resolveHeader(location.pathname, searchParams.get("mode"), messages, modeMessages, isAuthenticated);
  const navItems = messages.tabs;
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
              <Link aria-label={messages.shell.back} className="app-shell__back" to={header.backTo}>
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
                  {messages.shell.logout}
                </button>
              ) : null}
            </div>
          </div>
          {showAppNav ? (
            <nav className="app-shell__topnav" aria-label={messages.brand.name}>
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

function resolveHeader(
  pathname: string,
  mode: string | null,
  messages: AppMessages,
  modeMessages: ModeMessages,
  isAuthenticated: boolean,
) {
  if (pathname === "/login") {
    return null;
  }
  if (pathname === "/app") {
    return { kind: "home" as const, title: "", backTo: null };
  }
  if (pathname.startsWith("/app/session/")) {
    return { kind: "session" as const, title: mode && mode in modeMessages ? modeMessages[mode as keyof typeof modeMessages].title : messages.brand.tagline, backTo: "/app" };
  }
  if (pathname === "/paywall") {
    return { kind: "paywall" as const, title: messages.paywall.eyebrow, backTo: "/app" };
  }
  if (pathname === "/app/profile") {
    return { kind: "profile" as const, title: messages.profile.title, backTo: "/app" };
  }
  if (pathname === "/app/support") {
    return { kind: "support" as const, title: messages.support.title, backTo: "/app/profile" };
  }
  if (pathname === "/help") {
    return { kind: "help" as const, title: messages.staticPages.help.eyebrow, backTo: "/app" };
  }
  if (pathname.startsWith("/legal/")) {
    return { kind: "legal" as const, title: "Legal", backTo: isAuthenticated ? "/app/profile" : "/login" };
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
