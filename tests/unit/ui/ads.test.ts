import { describe, expect, it, vi } from 'vitest';
import { FEATURES } from '../../../src/features';
import { Ads, type AdProvider } from '../../../src/ui/ads';

function provider(): AdProvider & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    banner: () => void calls.push('banner'),
    interstitial: vi.fn(async () => void calls.push('interstitial')),
    removeAds: () => void calls.push('removeAds'),
  };
}

describe('ads', () => {
  it('are off in v1', () => {
    expect(FEATURES.ads).toBe(false);
  });

  it('render nothing and call nothing while the flag is off', async () => {
    const p = provider();
    const ads = new Ads(false, p);
    expect(ads.enabled).toBe(false);
    expect(ads.bannerSlot()).toBeNull();
    expect(await ads.interstitial('solved')).toBe(false);
    ads.removeAds();
    expect(p.calls).toEqual([]);
  });

  it('never show an interstitial while the puzzle is being played', async () => {
    const p = provider();
    const ads = new Ads(true, p);
    expect(await ads.interstitial('playing')).toBe(false);
    expect(p.calls).toEqual([]);
  });

  it('show the interstitial on a finished puzzle when the flag is on', async () => {
    const p = provider();
    const ads = new Ads(true, p);
    expect(await ads.interstitial('solved')).toBe(true);
    expect(await ads.interstitial('gaveUp')).toBe(true);
    expect(p.calls).toEqual(['interstitial', 'interstitial']);
  });

  it('do nothing without a provider, even when the flag is on', async () => {
    const ads = new Ads(true, null);
    expect(await ads.interstitial('solved')).toBe(false);
  });
});
