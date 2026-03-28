/**
 * Supabase redirects failed email links (reset, magic link, etc.) to the app URL with
 * error details in the hash or query. A stale session in localStorage can remain, so
 * the UI must handle these explicitly.
 */

export type ParsedAuthUrlError = {
  error?: string;
  error_code?: string;
  error_description?: string;
};

export function parseSupabaseAuthUrlError(): ParsedAuthUrlError | null {
  if (typeof window === "undefined") return null;
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);
  const error = hashParams.get("error") ?? searchParams.get("error");
  const error_code = hashParams.get("error_code") ?? searchParams.get("error_code");
  const error_description =
    hashParams.get("error_description") ?? searchParams.get("error_description");
  if (!error && !error_code && !error_description) return null;
  return {
    error: error ?? undefined,
    error_code: error_code ?? undefined,
    error_description: error_description ?? undefined,
  };
}

const SESSION_RESET_CODES = new Set([
  "flow_state_expired",
  "bad_code_verifier",
]);

/**
 * When true, clear the stored session so we do not show the dashboard behind an error URL.
 * Avoid clearing on generic OAuth "access_denied" (user cancelled) when there is no email-link code.
 * NOTE: otp_expired is now allowed through to reset-password so users can request a new link.
 */
export function shouldClearSessionForAuthUrlError(parsed: ParsedAuthUrlError): boolean {
  if (parsed.error_code && SESSION_RESET_CODES.has(parsed.error_code)) return true;
  // Allow otp_expired through - user will see a message to request a new link
  if (parsed.error_code === "otp_expired") return false;
  const d = (parsed.error_description ?? "").toLowerCase();
  if (d.includes("link is invalid") || d.includes("has expired")) return false;
  if (d.includes("email link")) return false;
  return false;
}

export function userMessageFromAuthUrlError(parsed: ParsedAuthUrlError): string {
  if (parsed.error_description) {
    try {
      return decodeURIComponent(parsed.error_description.replace(/\+/g, " "));
    } catch {
      return parsed.error_description.replace(/\+/g, " ");
    }
  }
  if (parsed.error_code === "otp_expired") {
    return "This reset link has expired. Please request a new password reset email.";
  }
  return "We could not complete the link sign-in. Please try again.";
}

export function stripSupabaseAuthErrorFromUrl(): void {
  const url = new URL(window.location.href);
  url.hash = "";
  for (const key of ["error", "error_code", "error_description", "error_uri", "sb"]) {
    url.searchParams.delete(key);
  }
  const qs = url.searchParams.toString();
  const path = `${url.pathname}${qs ? `?${qs}` : ""}`;
  window.history.replaceState(window.history.state, "", path);
}
