/** How a share attempt ended; `cancelled` means the player closed the share sheet. */
export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

/**
 * Shares plain text through the Web Share API where the browser has it, falling back to the
 * clipboard (spec §5 Results). The game URL is part of the text, so share targets that drop a
 * separate `url` field still get it.
 */
export async function shareResult(text: string): Promise<ShareOutcome> {
  if (typeof navigator.share === 'function' && navigator.canShare?.({ text }) !== false) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Not allowed here (e.g. no share targets): try the clipboard instead.
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
