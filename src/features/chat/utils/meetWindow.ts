let current: Window | null = null;

function escapeHtml(str: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return words[0]?.charAt(0).toUpperCase() || '?';
}

/** Self-contained waiting-room page painted into the placeholder tab — no external assets, since it's written via document.write() into a bare about:blank document. */
function buildWaitingPageHtml(label: string, callType: 'audio' | 'video'): string {
  const safeLabel = escapeHtml(label);
  const initials = escapeHtml(getInitials(label));
  const kind = callType === 'video' ? 'Video call' : 'Voice call';
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Calling ${safeLabel}…</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; height: 100%;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #ffffff; color: #0f172a;
    display: flex; align-items: center; justify-content: center;
  }
  @media (prefers-color-scheme: dark) {
    html, body { background: #0b0f19; color: #e5e7eb; }
  }
  .card { text-align: center; padding: 32px; }
  .avatar {
    position: relative;
    width: clamp(96px, 12vw, 180px); height: clamp(96px, 12vw, 180px); border-radius: 50%;
    margin: 0 auto clamp(24px, 3vw, 40px); display: flex; align-items: center; justify-content: center;
    font-size: clamp(32px, 4vw, 60px); font-weight: 600;
    background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.3));
    color: #6366f1;
  }
  .ring {
    position: absolute; inset: -8px; border-radius: 50%;
    border: 3px solid rgba(99,102,241,0.5);
    animation: pulse 1.6s ease-out infinite;
  }
  @keyframes pulse {
    0% { transform: scale(0.9); opacity: 0.8; }
    100% { transform: scale(1.35); opacity: 0; }
  }
  h1 { font-size: clamp(22px, 2.4vw, 36px); font-weight: 600; margin: 0 0 12px; }
  p { font-size: clamp(15px, 1.4vw, 20px); color: #6b7280; margin: 0; }
  .dots::after { content: ''; animation: dots 1.4s steps(4,end) infinite; }
  @keyframes dots { 0% { content: ''; } 25% { content: '.'; } 50% { content: '..'; } 75% { content: '...'; } 100% { content: ''; } }
</style>
</head>
<body>
  <div class="card">
    <div class="avatar"><div class="ring"></div>${initials}</div>
    <h1>Calling ${safeLabel}</h1>
    <p>${kind} &middot; waiting for them to join<span class="dots"></span></p>
  </div>
</body>
</html>`;
}

/**
 * Shared handle to the Google Meet tab for the active call. Opening a blank
 * window synchronously inside a click handler and navigating it later
 * (rather than calling window.open() with the real URL from an async
 * callback) avoids browser popup blockers, since only *opening new* windows
 * outside a user gesture is blocked — navigating an existing reference isn't.
 */
export const meetWindow = {
  /**
   * Opens the placeholder tab and immediately paints a "Calling <name>…"
   * waiting screen into it — the tab would otherwise sit on about:blank for
   * as long as the callee hasn't answered (up to the ring timeout).
   */
  openPlaceholder(label: string, callType: 'audio' | 'video' = 'video'): void {
    current = window.open('about:blank', '_blank');
    if (!current) return;
    try {
      current.document.open();
      current.document.write(buildWaitingPageHtml(label, callType));
      current.document.close();
    } catch {
      // Cross-origin or otherwise inaccessible — leave it blank, harmless.
    }
  },

  navigateOrOpen(uri: string): void {
    if (!uri) return;
    if (current && !current.closed) {
      current.location.href = uri;
      current.focus();
    } else {
      current = window.open(uri, '_blank');
    }
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
