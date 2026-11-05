import { describe, expect, it } from 'vitest';
import { Timer } from '../../../src/game/timer';

function clock() {
  let now = 1_000;
  return { now: () => now, advance: (ms: number) => (now += ms) };
}

describe('Timer', () => {
  it('counts up from the initial time', () => {
    const c = clock();
    const timer = new Timer(5_000, c.now);
    c.advance(2_000);
    expect(timer.elapsedMs).toBe(7_000);
  });

  it('stops counting while paused and resumes where it left off', () => {
    const c = clock();
    const timer = new Timer(0, c.now);
    c.advance(1_000);
    timer.pause('menu');
    c.advance(60_000);
    expect(timer.elapsedMs).toBe(1_000);
    timer.resume('menu');
    c.advance(500);
    expect(timer.elapsedMs).toBe(1_500);
  });

  it('runs only when every pause reason is gone', () => {
    const c = clock();
    const timer = new Timer(0, c.now);
    timer.pause('menu');
    timer.pause('hidden');
    timer.resume('menu');
    c.advance(10_000);
    expect(timer.running).toBe(false);
    expect(timer.elapsedMs).toBe(0);
    timer.resume('hidden');
    c.advance(1_000);
    expect(timer.elapsedMs).toBe(1_000);
  });

  it('ignores a repeated pause', () => {
    const c = clock();
    const timer = new Timer(0, c.now);
    c.advance(1_000);
    timer.pause('menu');
    timer.pause('menu');
    timer.resume('menu');
    c.advance(1_000);
    expect(timer.elapsedMs).toBe(2_000);
  });
});
