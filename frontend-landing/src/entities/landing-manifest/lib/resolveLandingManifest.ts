import { landingManifests } from "../model/manifests";
import type { LandingManifest } from "../model/types";

export const resolveLandingManifest = (host: string): LandingManifest | null => {
  const normalizedHost = host.trim().toLowerCase();
  return landingManifests.find((manifest) => manifest.host === normalizedHost) ?? null;
};
