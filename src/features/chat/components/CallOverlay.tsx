import { useEffect, useRef, useState } from 'react';
import { useCallStore } from '../stores/useCallStore';
import { chatTransport } from '../transport';
import { chatService } from '@/services/chat.service';
import { googleMeetService } from '@/services/googleMeet.service';
import { useEnsureGoogleMeetToken } from '@/features/integrations/hooks/useEnsureGoogleMeetToken';
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
  const meetWindowRef = useRef<Window | null>(null);
  const timerRef = useRef<number | null>(null);
  const ringTimeoutRef = useRef<number | null>(null);

  const reachable = participants.filter((p) => p.connected);
  const unreachable = participants.filter((p) => !p.connected);
  const primaryName = callerName || reachable[0]?.name || participants[0]?.name || 'them';
  const isGroupRing = reachable.length > 1;

  // Call duration timer, active state only.
  useEffect(() => {
    if (callState === 'active') {
      timerRef.current = window.setInterval(() => incrementDuration(), 1000) as unknown as number;
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
      meetWindowRef.current = window.open(meetingUri, '_blank', 'noopener,noreferrer');
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
    meetWindowRef.current?.close();
    meetWindowRef.current = null;
    reset();
  };

  const handleReopenMeet = () => {
    if (!meetingUri) return;
    meetWindowRef.current = window.open(meetingUri, '_blank', 'noopener,noreferrer');
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
                  {primaryName.slice(0, 2).toUpperCase() || '??'}
                </AvatarFallback>
              </Avatar>
              {(callState === 'outgoing' || callState === 'incoming') && (
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
                {callState === 'incoming' && `'${primaryName}' is trying to connect with you`}
                {callState === 'active' && 'Call in progress via Google Meet'}
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
        {callState === 'incoming' && (
          <div className="flex gap-4 w-full justify-center">
            <Button
              size="lg"
              variant="destructive"
              className="h-14 w-14 rounded-full p-0 flex items-center justify-center shadow-lg hover:shadow-destructive/20 hover:scale-105 transition-all"
              onClick={handleDecline}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              size="lg"
              className="h-14 w-14 rounded-full p-0 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 shadow-lg hover:shadow-emerald-600/20 hover:scale-105 transition-all text-white"
              onClick={handleAccept}
            >
              <Phone className="h-6 w-6" />
            </Button>
          </div>
        )}

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
