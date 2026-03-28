import { useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { mustCompletePasswordResetFlow } from "@/utils/authRecovery";
import {
  parseSupabaseAuthUrlError,
  shouldClearSessionForAuthUrlError,
  stripSupabaseAuthErrorFromUrl,
  userMessageFromAuthUrlError,
} from "@/utils/supabaseAuthUrl";

/**
 * 1) Invalid/expired email links put #error=… in the URL. For password recovery flows,
 *    allow navigation to /reset-password so users can request a new link if needed.
 * 2) Valid recovery sessions that land on the site root are sent to /reset-password.
 * 3) Only clear session for critical errors (flow_state_expired, bad_code_verifier).
 */
export function PasswordRecoveryRedirect() {
  const navigate = useNavigate();
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  useLayoutEffect(() => {
    let cancelled = false;

    void (async () => {
      const parsed = parseSupabaseAuthUrlError();
      if (parsed) {
        const clearSession = shouldClearSessionForAuthUrlError(parsed);
        if (clearSession) {
          await supabase.auth.signOut();
          stripSupabaseAuthErrorFromUrl();
          const message = userMessageFromAuthUrlError(parsed);
          if (!cancelled) {
            navigate("/forgot-password", {
              replace: true,
              state: { authLinkError: message },
            });
          }
          return;
        }
        // For non-critical errors (like otp_expired), strip the error and continue
        // This allows users to stay on reset-password and request a new link if needed
        stripSupabaseAuthErrorFromUrl();
      }

      if (cancelled) return;

      const path =
        typeof globalThis.window !== "undefined" ? globalThis.window.location.pathname : "";
      if (path === "/reset-password") return;

      const redirectIfRecovery = (newSession: Session) => {
        if (mustCompletePasswordResetFlow(newSession)) {
          navigate("/reset-password", { replace: true });
        }
      };

      const { data: { session: existing } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (existing) redirectIfRecovery(existing);

      const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
        if (!newSession) return;
        const p = globalThis.window?.location.pathname ?? "";
        if (p === "/reset-password") return;

        if (event === "PASSWORD_RECOVERY" || mustCompletePasswordResetFlow(newSession)) {
          navigate("/reset-password", { replace: true });
        }
      });
      subscriptionRef.current = data.subscription;
    })();

    return () => {
      cancelled = true;
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [navigate]);

  return null;
}
