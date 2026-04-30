import type { QuizLang } from "../../../shared/config/routes";

export type LandingExperienceType = "quiz";
export type LandingEnabledRoute = "quiz" | "email" | "legal";
export type LandingPaymentHandoffMode = "redirect_to_pay";

export type LandingManifest = {
  landing_id: string;
  host: string;
  default_locale: QuizLang;
  experience_type: LandingExperienceType;
  enabled_routes: LandingEnabledRoute[];
  theme: string;
  copy_set: string;
  asset_set: string;
  payment_handoff_mode: LandingPaymentHandoffMode;
};
