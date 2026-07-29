let current: Window | null = null;

/**
 * Shared handle to the Google Meet tab for the active call. No tab is opened
 * for the caller until the callee actually accepts (see useCallSignaling.ts)
 * — that accept arrives as an async socket event, not a click, so
 * window.open() there is a genuine "no user gesture" call and browsers are
 * free to block it. navigateOrOpen() returns the window it got (or null) so
 * callers can detect a block and offer a manual fallback — a click on that
 * fallback is a real gesture, so the same call always succeeds from there.
 */
export const meetWindow = {
  navigateOrOpen(uri: string): Window | null {
    if (!uri) return null;
    if (current && !current.closed) {
      current.location.href = uri;
      current.focus();
    } else {
      current = window.open(uri, '_blank');
    }
    return current;
  },

  close(): void {
    current?.close();
    current = null;
  },

  /** True once a window was opened and the user has since closed it (or none was ever opened). */
  isClosed(): boolean {
    return current !== null && current.closed;
  },
};
