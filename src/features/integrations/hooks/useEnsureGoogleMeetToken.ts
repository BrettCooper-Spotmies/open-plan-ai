import { useCallback } from 'react';
import { useGoogleMeetStore } from '../stores/useGoogleMeetStore';
import { useGoogleIdentityServices } from './useGoogleIdentityServices';

const SCOPES =
  'https://www.googleapis.com/auth/meetings.space.created https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email';

/**
 * GIS access tokens expire after ~1hr with no refresh token. Without this,
 * useGoogleMeetStore.isConnected stays true forever while the token silently
 * goes dead, and every Meet/Calendar call starts failing with a confusing
 * 401. Call ensureFreshToken() right before any such call — it reuses the
 * current token if still valid, otherwise attempts a silent (no popup)
 * re-issue since the user already granted consent once.
 */
export function useEnsureGoogleMeetToken() {
  const { isLoaded: gisLoaded } = useGoogleIdentityServices();

  const ensureFreshToken = useCallback(async (): Promise<string | null> => {
    const store = useGoogleMeetStore.getState();
    if (!store.isConnected) return null;
    if (store.accessToken && !store.isTokenExpired()) return store.accessToken;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !gisLoaded || !window.google?.accounts?.oauth2) return null;

    return new Promise<string | null>((resolve) => {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: (tokenResponse: { error?: string; access_token?: string; expires_in?: number }) => {
            if (tokenResponse.error || !tokenResponse.access_token) {
              resolve(null);
              return;
            }
            store.setConnected(tokenResponse.access_token, store.userEmail ?? '', tokenResponse.expires_in ?? 3600);
            resolve(tokenResponse.access_token);
          },
          error_callback: () => resolve(null),
        });
        // Silent re-issue only — no consent popup. If this fails (e.g. the
        // user revoked access), the caller should prompt them to reconnect
        // from Integrations rather than surprise-popping a consent window.
        client.requestAccessToken({ prompt: '' });
      } catch {
        resolve(null);
      }
    });
  }, [gisLoaded]);

  return { ensureFreshToken };
}
