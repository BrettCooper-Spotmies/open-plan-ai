import { apiClient } from './api/client';
import { ENDPOINTS } from './api/endpoints';
import { logger } from './monitoring/logger';

export interface ScheduleEventParams {
  title: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  attendees: string[]; // List of emails
}

export interface GoogleMeetStatus {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
}

export const googleMeetService = {
  /**
   * Records on the backend that the current user has connected Google Meet.
   * No OAuth token is ever sent — this is only a reachability flag so other
   * users can see whether this person can be called, independent of whose
   * browser/localStorage the token itself lives in.
   */
  async reportConnected(email: string): Promise<void> {
    await apiClient.post(ENDPOINTS.GOOGLE_MEET.CONNECT, { email });
  },

  async reportDisconnected(): Promise<void> {
    await apiClient.post(ENDPOINTS.GOOGLE_MEET.DISCONNECT);
  },

  /** Batch-fetch Google Meet connection status for a set of user IDs. */
  async getStatus(userIds: string[]): Promise<Record<string, GoogleMeetStatus>> {
    if (userIds.length === 0) return {};
    return apiClient.get<Record<string, GoogleMeetStatus>>(ENDPOINTS.GOOGLE_MEET.STATUS(userIds));
  },

  /**
   * Creates an instant Google Meet room using the Google Meet REST API v2.
   * POST https://meet.googleapis.com/v2/spaces
   */
  async createInstantMeeting(accessToken: string): Promise<{ meetingUri: string; name: string }> {
    try {
      const response = await fetch('https://meet.googleapis.com/v2/spaces', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config: { accessType: 'OPEN' } }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Google Meet API error: ${response.statusText} - ${errBody}`);
      }

      const data = await response.json();
      // The API returns meetingUri (e.g. https://meet.google.com/abc-defg-hij) and name (space identifier)
      // accessType: OPEN means anyone with the link joins immediately —
      // no host has to be present to let guests in.
      return {
        meetingUri: data.meetingUri,
        name: data.name,
      };
    } catch (error) {
      logger.error('Failed to create instant Google Meet:', error);
      throw error;
    }
  },

  /**
   * Schedules a Calendar Event with a Google Meet conference link attached.
   * POST https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1
   */
  async scheduleCalendarMeeting(
    accessToken: string,
    params: ScheduleEventParams
  ): Promise<{ htmlLink: string; meetingUri: string }> {
    try {
      const requestId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      const body = {
        summary: params.title,
        description: 'Scheduled via Open Plan AI Google Meet Integration',
        start: {
          dateTime: params.startTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: params.endTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        attendees: params.attendees.map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: {
              type: 'hangoutsMeeting', // Automatically creates a Google Meet link
            },
          },
        },
      };

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Google Calendar API error: ${response.statusText} - ${errBody}`);
      }

      const data = await response.json();
      
      // Extract the Meet link from conferenceData entry
      const entry = data.conferenceData?.entryPoints?.find(
        (ep: any) => ep.entryPointType === 'video'
      );
      const meetingUri = entry?.uri || data.hangoutLink || '';

      return {
        htmlLink: data.htmlLink, // Calendar event link
        meetingUri,             // The Google Meet link
      };
    } catch (error) {
      logger.error('Failed to schedule calendar meeting:', error);
      throw error;
    }
  },

  /**
   * Fetches user profile/email info to verify who is logged in.
   * GET https://www.googleapis.com/oauth2/v3/userinfo
   */
  async fetchUserProfile(accessToken: string): Promise<{ email: string; name?: string }> {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user profile info');
    }

    return response.json();
  },
};
