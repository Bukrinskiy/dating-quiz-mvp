/* eslint-disable react-refresh/only-export-components */
import type { ReactNode, SVGProps } from "react";

type SvgProps = SVGProps<SVGSVGElement> & {
  color?: string;
};

type ResultIconName = "why" | "risks" | "avoid" | "next" | "simple" | "alt" | "leverage" | "plan24" | "ifReply" | "ifNoReply" | "template";

const svgProps = ({ color, ...props }: SvgProps = {}, fallback = "currentColor") => ({
  ...props,
  color: color || fallback,
});

export const PrototypeIcon = {
  chat: ({ color, ...props }: SvgProps = {}) => (
    <svg {...svgProps({ color, ...props }, "currentColor")} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 15C21 15.53 20.79 16.04 20.41 16.41C20.04 16.79 19.53 17 19 17H7L3 21V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H19C19.53 3 20.04 3.21 20.41 3.59C20.79 3.96 21 4.47 21 5V15Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  lock: ({ color, ...props }: SvgProps = {}) => (
    <svg {...svgProps({ color, ...props }, "currentColor")} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 11V7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7V11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  helpC: ({ color, ...props }: SvgProps = {}) => (
    <svg {...svgProps({ color, ...props }, "currentColor")} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9.09 9C9.32 8.33 9.77 7.77 10.36 7.41C10.95 7.05 11.65 6.91 12.34 7.02C13.03 7.13 13.65 7.49 14.09 8.03C14.53 8.57 14.76 9.26 14.75 9.96C14.75 12 11.75 13 11.75 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" />
    </svg>
  ),
  person: ({ color, ...props }: SvgProps = {}) => (
    <svg {...svgProps({ color, ...props }, "currentColor")} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 20C4 17.24 7.58 15 12 15C16.42 15 20 17.24 20 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  back: ({ ...props }: SvgProps = {}) => (
    <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 18L9 12L15 6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chevron: ({ color, ...props }: SvgProps = {}) => (
    <svg {...svgProps({ color, ...props }, "currentColor")} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  close: ({ color, ...props }: SvgProps = {}) => (
    <svg {...svgProps({ color, ...props }, "var(--ink2)")} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  trash: ({ color, ...props }: SvgProps = {}) => (
    <svg {...svgProps({ color, ...props }, "currentColor")} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 6H21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 6V4C8 3.45 8.45 3 9 3H15C15.55 3 16 3.45 16 4V6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M19 6L18.15 19.08C18.08 20.16 17.18 21 16.1 21H7.9C6.82 21 5.92 20.16 5.85 19.08L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10 11V16M14 11V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  send: ({ ...props }: SvgProps = {}) => (
    <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2Z" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  mic: ({ color, ...props }: SvgProps = {}) => (
    <svg {...svgProps({ color, ...props }, "var(--accent)")} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 11C5 14.87 8.13 18 12 18C15.87 18 19 14.87 19 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  image: ({ color, ...props }: SvgProps = {}) => (
    <svg {...svgProps({ color, ...props }, "var(--ink2)")} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
      <path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  camera: ({ color, ...props }: SvgProps = {}) => (
    <svg {...svgProps({ color, ...props }, "var(--ink2)")} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M23 19C23 19.53 22.79 20.04 22.41 20.41C22.04 20.79 21.53 21 21 21H3C2.47 21 1.96 20.79 1.59 20.41C1.21 20.04 1 19.53 1 19V8C1 7.47 1.21 6.96 1.59 6.59C1.96 6.21 2.47 6 3 6H7L9 3H15L17 6H21C21.53 6 22.04 6.21 22.41 6.59C22.79 6.96 23 7.47 23 8V19Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  plus: ({ color, style, ...props }: SvgProps & { rotated?: boolean } = {}) => (
    <svg {...svgProps({ color, ...props }, "var(--accent)")} width="20" height="20" viewBox="0 0 24 24" fill="none" style={style} aria-hidden="true">
      <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  copy: ({ ...props }: SvgProps = {}) => (
    <svg {...props} width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="#fff" strokeWidth="1.6" />
      <path d="M5 15H4C2.9 15 2 14.1 2 13V4C2 2.9 2.9 2 4 2H13C14.1 2 15 2.9 15 4V5" stroke="#fff" strokeWidth="1.6" />
    </svg>
  ),
  pencil: ({ color, ...props }: SvgProps = {}) => (
    <svg {...svgProps({ color, ...props }, "currentColor")} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M11 4H4C3.47 4 2.96 4.21 2.59 4.59C2.21 4.96 2 5.47 2 6V20C2 20.53 2.21 21.04 2.59 21.41C2.96 21.79 3.47 22 4 22H18C18.53 22 19.04 21.79 19.41 21.41C19.79 21.04 20 20.53 20 20V13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 2.5C18.9 2.1 19.44 1.88 20 1.88C20.56 1.88 21.1 2.1 21.5 2.5C21.9 2.9 22.12 3.44 22.12 4C22.12 4.56 21.9 5.1 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  compass: ({ color, ...props }: SvgProps = {}) => (
    <svg {...svgProps({ color, ...props }, "currentColor")} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16.24 7.76L14.12 14.12L7.76 16.24L9.88 9.88L16.24 7.76Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  bell: ({ ...props }: SvgProps = {}) => (
    <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 8C18 6.41 17.37 4.88 16.24 3.76C15.12 2.63 13.59 2 12 2C10.41 2 8.88 2.63 7.76 3.76C6.63 4.88 6 6.41 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="var(--ink2)" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13.73 21C13.55 21.3 13.3 21.55 13 21.73C12.69 21.9 12.35 21.99 12 21.99C11.65 21.99 11.3 21.9 11 21.73C10.7 21.55 10.45 21.3 10.27 21" stroke="var(--ink2)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  sun: ({ color, ...props }: SvgProps = {}) => (
    <svg {...svgProps({ color, ...props }, "currentColor")} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 2V5M12 19V22M4.93 4.93L7.05 7.05M16.95 16.95L19.07 19.07M2 12H5M19 12H22M4.93 19.07L7.05 16.95M16.95 7.05L19.07 4.93" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  moon: ({ color, ...props }: SvgProps = {}) => (
    <svg {...svgProps({ color, ...props }, "currentColor")} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 12.79C20.16 13.11 19.25 13.29 18.29 13.29C14.1 13.29 10.71 9.9 10.71 5.71C10.71 4.75 10.89 3.84 11.21 3C6.98 3.39 3.67 6.95 3.67 11.28C3.67 15.87 7.39 19.59 11.98 19.59C16.31 19.59 19.87 16.28 20.26 12.05C20.5 12.31 20.75 12.56 21 12.79Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  globe: ({ color, ...props }: SvgProps = {}) => (
    <svg {...svgProps({ color, ...props }, "currentColor")} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 12H21M12 3C14.2 5.45 15.25 8.43 15.25 12C15.25 15.57 14.2 18.55 12 21M12 3C9.8 5.45 8.75 8.43 8.75 12C8.75 15.57 9.8 18.55 12 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  card: ({ color, ...props }: SvgProps = {}) => (
    <svg {...svgProps({ color, ...props }, "currentColor")} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  refresh: ({ ...props }: SvgProps = {}) => (
    <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M23 4V10H17" stroke="var(--ink2)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.49 15C19.84 16.81 18.6 18.35 17 19.38C15.4 20.41 13.5 20.87 11.6 20.67C9.7 20.47 7.93 19.6 6.6 18.23C5.27 16.86 4.47 15.08 4.32 13.18C4.17 11.28 4.68 9.39 5.77 7.83C6.86 6.27 8.46 5.14 10.29 4.64C12.12 4.14 14.07 4.31 15.78 5.11C17.49 5.9 18.86 7.27 19.65 8.98L23 10" stroke="var(--ink2)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  msgIcon: ({ color, ...props }: SvgProps = {}) => (
    <svg {...svgProps({ color, ...props }, "currentColor")} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 15C21 15.53 20.79 16.04 20.41 16.41C20.04 16.79 19.53 17 19 17H7L3 21V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H19C19.53 3 20.04 3.21 20.41 3.59C20.79 3.96 21 4.47 21 5V15Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  support: ({ color, ...props }: SvgProps = {}) => (
    <svg {...svgProps({ color, ...props }, "currentColor")} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 15C20 15.53 19.79 16.04 19.41 16.41C19.04 16.79 18.53 17 18 17H7L4 20V6C4 5.47 4.21 4.96 4.59 4.59C4.96 4.21 5.47 4 6 4H18C18.53 4 19.04 4.21 19.41 4.59C19.79 4.96 20 5.47 20 6V15Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10.5 9.5H13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 12V12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  info: ({ color, ...props }: SvgProps = {}) => (
    <svg {...svgProps({ color, ...props }, "currentColor")} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
      <line x1="12" y1="8" x2="12" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 12V16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  logout: ({ color, ...props }: SvgProps = {}) => (
    <svg {...svgProps({ color, ...props }, "currentColor")} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 21H5C4.47 21 3.96 20.79 3.59 20.41C3.21 20.04 3 19.53 3 19V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  link: ({ color, ...props }: SvgProps = {}) => (
    <svg {...svgProps({ color, ...props }, "currentColor")} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 13C10.43 13.57 10.98 14.05 11.61 14.39C12.24 14.74 12.93 14.94 13.65 14.99C14.36 15.04 15.08 14.94 15.75 14.69C16.42 14.44 17.03 14.05 17.54 13.54L20.54 10.54C21.45 9.6 21.95 8.33 21.94 7.02C21.93 5.71 21.41 4.46 20.48 3.53C19.55 2.6 18.3 2.08 16.99 2.07C15.68 2.06 14.41 2.56 13.47 3.47L11.75 5.18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 11C13.57 10.43 13.02 9.95 12.39 9.61C11.76 9.26 11.07 9.06 10.35 9.01C9.64 8.96 8.92 9.06 8.25 9.31C7.58 9.56 6.97 9.95 6.46 10.46L3.46 13.46C2.55 14.4 2.05 15.67 2.06 16.98C2.07 18.29 2.59 19.54 3.52 20.47C4.45 21.4 5.7 21.92 7.01 21.93C8.32 21.94 9.59 21.44 10.53 20.53L12.24 18.82" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  shield: ({ ...props }: SvgProps = {}) => (
    <svg {...svgProps(props, "currentColor")} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  users: ({ color, ...props }: SvgProps = {}) => (
    <svg {...svgProps({ color, ...props }, "currentColor")} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17 21V19C17 17.93 16.58 16.92 15.83 16.17C15.08 15.42 14.06 15 13 15H5C3.94 15 2.92 15.42 2.17 16.17C1.42 16.92 1 17.93 1 19V21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M23 21V19C23 18.11 22.7 17.25 22.17 16.55C21.62 15.85 20.86 15.35 20 15.13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 3.13C16.86 3.35 17.62 3.85 18.17 4.55C18.71 5.25 19.01 6.12 19.01 7.005C19.01 7.89 18.71 8.76 18.17 9.46C17.62 10.16 16.86 10.66 16 10.88" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  phone: ({ ...props }: SvgProps = {}) => (
    <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22 16.92V19.92C22 20.49 21.78 21.03 21.38 21.43C20.97 21.83 20.43 22.05 19.86 22.05C16.71 21.71 13.68 20.62 11.01 18.88C8.52 17.29 6.41 15.18 4.81 12.69C3.07 10 1.98 6.96 1.65 3.79C1.64 3.23 1.87 2.68 2.27 2.28C2.67 1.88 3.21 1.65 3.77 1.65H6.77C7.78 1.64 8.63 2.36 8.77 3.36C8.9 4.24 9.12 5.11 9.44 5.95C9.71 6.66 9.53 7.46 8.98 7.98L7.71 9.25C9.18 11.83 11.29 13.94 13.87 15.41L15.14 14.14C15.66 13.59 16.46 13.41 17.17 13.68C18.01 13.99 18.88 14.22 19.76 14.35C20.76 14.49 21.5 15.36 21.48 16.38L22 16.92Z" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  history: ({ ...props }: SvgProps = {}) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="var(--ink3)" strokeWidth="1.5" />
      <polyline points="12 6 12 12 16 14" stroke="var(--ink3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sparkle: ({ ...props }: SvgProps = {}) => (
    <svg {...svgProps(props, "currentColor")} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  emptyChat: ({ ...props }: SvgProps = {}) => (
    <svg {...svgProps(props, "currentColor")} width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 15C21 15.53 20.79 16.04 20.41 16.41C20.04 16.79 19.53 17 19 17H7L3 21V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H19C19.53 3 20.04 3.21 20.41 3.59C20.79 3.96 21 4.47 21 5V15Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <line x1="8" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="8" y1="13" x2="13" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
} as const;

export function renderResultIcon(name: ResultIconName): ReactNode {
  switch (name) {
    case "why":
      return <PrototypeIcon.compass color="var(--accent)" />;
    case "risks":
      return <PrototypeIcon.info />;
    case "avoid":
      return <PrototypeIcon.close color="var(--red)" />;
    case "next":
      return <PrototypeIcon.chevron />;
    case "simple":
      return <PrototypeIcon.chat color="var(--accent)" />;
    case "alt":
      return <PrototypeIcon.plus />;
    case "leverage":
      return <PrototypeIcon.link />;
    case "plan24":
      return <PrototypeIcon.history />;
    case "ifReply":
      return <PrototypeIcon.msgIcon />;
    case "ifNoReply":
      return <PrototypeIcon.helpC color="var(--ink2)" />;
    case "template":
      return <PrototypeIcon.pencil color="var(--accent)" />;
    default:
      return null;
  }
}
