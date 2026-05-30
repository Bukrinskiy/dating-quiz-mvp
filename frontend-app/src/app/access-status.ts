import type { AccessStatus, AppAccessStatusLabel } from "./types";

export function resolveStatusLabel(access: AccessStatus | null | undefined): AppAccessStatusLabel {
  if (access?.status_label === "Inactive" || access?.status_label === "Active" || access?.status_label === "Promo") {
    return access.status_label;
  }
  if (!access?.has_access) {
    return "Inactive";
  }
  return access.access_status === "promo_active" ? "Promo" : "Active";
}
