/**
 * A count-up play timer that can be paused (spec §5 Timer). It pauses for several independent
 * reasons at once (tab hidden, menu open, puzzle over) and runs only when none applies.
 */
export class Timer {
  private accumulated: number;
  private runningSince: number | null = null;
  private readonly reasons = new Set<string>();

  constructor(
    initialMs = 0,
    private readonly now: () => number = () => performance.now(),
  ) {
    this.accumulated = initialMs;
    this.runningSince = this.now();
  }

  get elapsedMs(): number {
    const running = this.runningSince === null ? 0 : this.now() - this.runningSince;
    return this.accumulated + running;
  }

  get running(): boolean {
    return this.runningSince !== null;
  }

  pause(reason: string): void {
    if (this.runningSince !== null) {
      this.accumulated += this.now() - this.runningSince;
      this.runningSince = null;
    }
    this.reasons.add(reason);
  }

  resume(reason: string): void {
    this.reasons.delete(reason);
    if (this.reasons.size === 0 && this.runningSince === null) this.runningSince = this.now();
  }
}
