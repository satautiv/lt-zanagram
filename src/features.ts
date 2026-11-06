/** Feature flags, fixed at build time. Turning one on is a code change, never a runtime toggle. */
export interface Features {
  /**
   * Ad slots (spec §10 Ads later): a banner below the board, an interstitial on the results
   * screen and the "Remove ads" toolbar button. Off in v1; the ad network is chosen later.
   */
  ads: boolean;
}

export const FEATURES: Readonly<Features> = { ads: false };
