import type { LandingManifest } from "./types";

export const landingManifests: LandingManifest[] = [
  {
    landing_id: "lp1",
    host: "lp1.flirto.guru",
    default_locale: "en",
    experience_type: "quiz",
    enabled_routes: ["quiz", "email", "legal"],
    theme: "affemity-funnel",
    copy_set: "affemity-v1",
    asset_set: "affemity-funnel",
    payment_handoff_mode: "redirect_to_pay",
  },
  {
    landing_id: "lp1-dev",
    host: "localhost",
    default_locale: "en",
    experience_type: "quiz",
    enabled_routes: ["quiz", "email", "legal"],
    theme: "affemity-funnel",
    copy_set: "affemity-v1",
    asset_set: "affemity-funnel",
    payment_handoff_mode: "redirect_to_pay",
  },
  {
    landing_id: "lp1-dev-loopback",
    host: "127.0.0.1",
    default_locale: "en",
    experience_type: "quiz",
    enabled_routes: ["quiz", "email", "legal"],
    theme: "affemity-funnel",
    copy_set: "affemity-v1",
    asset_set: "affemity-funnel",
    payment_handoff_mode: "redirect_to_pay",
  },
];
