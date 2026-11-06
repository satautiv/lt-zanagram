import type { GameStatus } from '../core';

/** What an ad network plugs in once one is chosen (deferred past v1, spec §11). */
export interface AdProvider {
  /** Fills the fixed-height banner slot below the board. */
  banner(slot: HTMLElement): void;
  /** Shows a full-screen ad; resolves once the player has dismissed it. */
  interstitial(): Promise<void>;
  /** The "Remove ads" toolbar button (paid unlock or not: an open question). */
  removeAds(): void;
}

/**
 * The ad slots behind the `ads` feature flag (spec §10). While the flag is off, or no provider is
 * plugged in, nothing is created and the provider is never called.
 *
 * Rule: no ad may ever show over the board mid-puzzle. The banner lives in its own fixed-height
 * slot below the board, never on top of it, and `interstitial` refuses while the puzzle is still
 * being played. Every ad goes through this class, so the rule is enforced in one place.
 */
export class Ads {
  constructor(
    private readonly flag: boolean,
    private readonly provider: AdProvider | null,
  ) {}

  get enabled(): boolean {
    return this.flag && this.provider !== null;
  }

  /** The banner slot to place below the board, or null while ads are off. */
  bannerSlot(): HTMLElement | null {
    if (!this.enabled) return null;
    const slot = document.createElement('aside');
    slot.className = 'ad-banner';
    this.provider!.banner(slot);
    return slot;
  }

  /**
   * The results-screen hook. Shows an interstitial only for a finished puzzle (solved or given up);
   * returns whether one was shown.
   */
  async interstitial(status: GameStatus): Promise<boolean> {
    if (!this.enabled || status === 'playing') return false;
    await this.provider!.interstitial();
    return true;
  }

  removeAds(): void {
    if (this.enabled) this.provider!.removeAds();
  }
}
