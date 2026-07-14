import { useEffect, useRef, useState } from 'react';
import { useCallStore } from '../stores/useCallStore';
import { chatTransport } from '../transport';
import { chatService } from '@/services/chat.service';
import { googleMeetService } from '@/services/googleMeet.service';
import { useEnsureGoogleMeetToken } from '@/features/integrations/hooks/useEnsureGoogleMeetToken';
import { meetWindow } from '../utils/meetWindow';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Phone,
  PhoneOff,
  Video,
  ExternalLink,
  Send,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const RING_TIMEOUT_MS = 45_000;

function getInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return words[0]?.charAt(0).toUpperCase() || '??';
}

export function CallOverlay() {
  const {
    callState,
    callType,
    callId,
    conversationId,
    meetingUri,
    participants,
    callerName,
    callDuration,
    markActive,
    reset,
    incrementDuration,
  } = useCallStore();

  const { ensureFreshToken } = useEnsureGoogleMeetToken();
  const [generatingLink, setGeneratingLink] = useState(false);
  const timerRef = useRef<number | null>(null);
  const ringTimeoutRef = useRef<number | null>(null);

  const reachable = participants.filter((p) => p.connected);
  const unreachable = participants.filter((p) => !p.connected);
  const primaryName = callerName || reachable[0]?.name || participants[0]?.name || 'them';
  const isGroupRing = reachable.length > 1;

  // Call duration timer, active state only. Also polls whether the user
  // closed the actual Meet tab — that's the only signal we can read
  // cross-origin — and ends the call in-app (and for the other party, via
  // the socket relay) when it happens, so this overlay doesn't run forever.
  useEffect(() => {
    if (callState === 'active') {
      timerRef.current = window.setInterval(() => {
        incrementDuration();
        if (meetWindow.isClosed()) {
          handleEnd();
        }
      }, 1000) as unknown as number;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [callState, incrementDuration]);

  // Ring timeout — an outgoing/incoming call that's never answered shouldn't
  // ring forever. Each side times out independently (no cross-messaging).
  useEffect(() => {
    if (callState === 'outgoing' || callState === 'incoming') {
      ringTimeoutRef.current = window.setTimeout(() => {
        if (callState === 'outgoing' && callId && conversationId) {
          chatTransport.emitCallEnd({ callId, conversationId });
          meetWindow.close();
        }
        toast.info(callState === 'outgoing' ? 'No answer' : 'Missed call');
        reset();
      }, RING_TIMEOUT_MS) as unknown as number;
    }
    return () => {
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
    };
  }, [callState, callId, conversationId, reset]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleAccept = () => {
    if (!callId || !conversationId) return;
    chatTransport.emitCallAccept({ callId, conversationId });
    markActive();
    if (meetingUri) {
      meetWindow.navigateOrOpen(meetingUri);
    }
  };

  const handleDecline = () => {
    if (callId && conversationId) {
      chatTransport.emitCallDecline({ callId, conversationId });
    }
    reset();
  };

  const handleEnd = () => {
    if (callId && conversationId) {
      chatTransport.emitCallEnd({ callId, conversationId });
    }
    meetWindow.close();
    reset();
  };

  const handleReopenMeet = () => {
    if (!meetingUri) return;
    meetWindow.navigateOrOpen(meetingUri);
  };

  const handleSendLink = async () => {
    if (!conversationId) return;
    setGeneratingLink(true);
    try {
      let uri = meetingUri;
      if (!uri) {
        const token = await ensureFreshToken();
        if (!token) {
          toast.error('Reconnect Google Meet in Integrations, then try again.');
          return;
        }
        const meetData = await googleMeetService.createInstantMeeting(token);
        uri = meetData.meetingUri;
      }
      await chatService.sendMessage(conversationId, `I created a Google Meet call. Let's connect here: ${uri}`);
      toast.success('Google Meet link sent to chat!');
      reset();
    } catch {
      toast.error('Failed to create or send the Google Meet link.');
    } finally {
      setGeneratingLink(false);
    }
  };

  if (callState === 'idle') return null;

  // Incoming calls get a compact, resizable notification card in the
  // corner instead of covering the screen — the user shouldn't lose
  // whatever they were doing just because a call came in. Accepting
  // hands off to the full-screen branch below via markActive().
  if (callState === 'incoming') {
    const groupLabel = isGroupRing
      ? `${primaryName} + ${reachable.length - 1} other${reachable.length > 2 ? 's' : ''}`
      : primaryName;

    return (
      <div
        className="fixed bottom-6 right-6 z-50 flex w-[380px] h-[260px] min-w-[300px] min-h-[220px] max-w-[520px] max-h-[80vh] resize flex-col gap-3 overflow-auto rounded-2xl border border-border bg-background p-4 shadow-2xl select-none animate-in slide-in-from-bottom-4 fade-in duration-300"
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span>Google Meet Calling</span>
        </div>

        <div className="flex flex-1 items-center gap-3">
          <div className="relative h-14 w-14 shrink-0 rounded-full overflow-hidden border-2 border-primary/20 bg-muted shadow-md flex items-center justify-center">
            <Avatar className="h-full w-full rounded-none">
              <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-primary/10 to-primary/20 text-primary">
                {getInitials(primaryName)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full border-2 border-primary/60 animate-ping opacity-25 pointer-events-none" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-foreground">{groupLabel}</h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              {callType === 'video' ? (
                <Video className="h-3 w-3 shrink-0 text-primary" />
              ) : (
                <Phone className="h-3 w-3 shrink-0 text-primary" />
              )}
              <span className="truncate">'{primaryName}' is trying to connect with you</span>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            size="icon"
            variant="destructive"
            className="h-10 w-10 rounded-full shadow hover:scale-105 transition-all"
            onClick={handleDecline}
            title="Decline"
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            className="h-10 w-10 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow hover:scale-105 transition-all"
            onClick={handleAccept}
            title="Accept"
          >
            <Phone className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  const showUnreachablePanel = callState === 'outgoing' && reachable.length === 0;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 flex flex-col items-center justify-between p-6 select-none animate-in fade-in duration-200">
      <div className="w-full flex items-center justify-between text-muted-foreground text-sm max-w-lg">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span>Google Meet Calling</span>
        </div>
        {callState === 'active' && (
          <span className="font-mono text-foreground font-semibold bg-primary/10 px-2 py-0.5 rounded-full">
            {formatTime(callDuration)}
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full max-w-lg">
        {showUnreachablePanel ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 text-center max-w-sm flex flex-col items-center gap-4 animate-in zoom-in-95">
            <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center text-destructive">
              <PhoneOff className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1 text-base">
                {participants.length > 1 ? 'No one is reachable' : 'Recipient Not Connected'}
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Invalid call as {participants.map((p) => p.name).join(', ') || 'they'} hasn't connected to the
                Google Meet integration. Please send them a link instead.
              </p>
            </div>
            <div className="flex gap-2 w-full mt-2">
              <Button variant="outline" className="flex-1 border-border" onClick={reset} disabled={generatingLink}>
                Close
              </Button>
              <Button variant="default" className="flex-1 gap-2" onClick={handleSendLink} disabled={generatingLink}>
                {generatingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Link
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative w-full flex flex-col items-center gap-6">
            <div className="relative h-48 w-48 md:h-56 md:w-56 rounded-full overflow-hidden border-2 border-primary/20 bg-muted shadow-2xl flex items-center justify-center">
              <Avatar className="h-full w-full rounded-none">
                <AvatarFallback className="text-4xl font-semibold bg-gradient-to-br from-primary/10 to-primary/20 text-primary">
                  {getInitials(primaryName)}
                </AvatarFallback>
              </Avatar>
              {callState === 'outgoing' && (
                <div className="absolute inset-0 rounded-full border-2 border-primary/60 animate-ping opacity-25 pointer-events-none" />
              )}
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {isGroupRing ? `${primaryName} + ${reachable.length - 1} other${reachable.length > 2 ? 's' : ''}` : primaryName}
              </h2>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest text-xs flex items-center justify-center gap-1.5">
                {callType === 'video' ? (
                  <Video className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Phone className="h-3.5 w-3.5 text-primary" />
                )}
                {callState === 'outgoing' && `Trying to connect to '${primaryName}'`}
                {callState === 'active' && `${primaryName} connected — call in progress via Google Meet`}
              </p>
              {callState === 'active' && (
                <p className="text-xs text-muted-foreground">
                  The audio/video happens in the Google Meet tab — reopen it if you closed it.
                </p>
              )}
              {unreachable.length > 0 && callState !== 'active' && (
                <p className="text-xs text-muted-foreground max-w-xs">
                  {unreachable.map((p) => p.name || 'Someone').join(', ')} hasn't connected Google Meet and won't be notified.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-lg flex flex-col items-center gap-4">
        {callState === 'outgoing' && reachable.length > 0 && (
          <Button
            size="lg"
            variant="destructive"
            className="h-14 w-14 rounded-full p-0 flex items-center justify-center shadow-lg hover:shadow-destructive/25 hover:scale-105 transition-all"
            onClick={handleEnd}
            title="Cancel call"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        )}

        {callState === 'active' && (
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2 rounded-full" onClick={handleReopenMeet}>
              <ExternalLink className="h-4 w-4" />
              Reopen Meet
            </Button>
            <Button
              size="lg"
              variant="destructive"
              className="h-14 w-14 rounded-full p-0 flex items-center justify-center shadow-lg hover:shadow-destructive/25 hover:scale-105 transition-all"
              onClick={handleEnd}
              title="Hang up"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
