import type { PropsWithChildren } from "react";
import { useLocation } from "react-router-dom";
import { addClickIdToPath } from "../../entities/tracking-attribution/model";
import { buildSharedSiteUrl } from "../config/runtime";

type BrandHomeLinkProps = PropsWithChildren<{
  className?: string;
  ariaLabel: string;
}>;

export const BrandHomeLink = ({ ariaLabel, children, className = "" }: BrandHomeLinkProps) => {
  const location = useLocation();
  const href = buildSharedSiteUrl(addClickIdToPath("/", location.search));

  return (
    <a className={className} href={href} aria-label={ariaLabel}>
      {children}
    </a>
  );
};
