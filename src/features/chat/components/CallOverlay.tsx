import { useEffect, useRef, useState } from 'react';
import { useCallStore } from '../stores/useCallStore';
import { useGoogleMeetStore } from '@/features/integrations/stores/useGoogleMeetStore';
import { googleMeetService } from '@/services/googleMeet.service';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  Send,
  Loader2,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface CallOverlayProps {
  onSendMessage?: (content: string) => Promise<void>;
}

export function CallOverlay({ onSendMessage }: CallOverlayProps) {
  const {
    callState,
    callType,
    remoteUserId,
    remoteUserName,
    remoteUserConnected,
    isMuted,
    isCameraOff,
    callDuration,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleCamera,
    incrementDuration,
  } = useCallStore();

  const { accessToken } = useGoogleMeetStore();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);

  // 1. Manage camera / mic access
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    const startMedia = async () => {
      // Only request media access if call state is outgoing (with connected user), or active
      if (
        (callState === 'outgoing' && remoteUserConnected) ||
        callState === 'active'
      ) {
        try {
          const constraints = {
            audio: true,
            video: callType === 'video' && !isCameraOff,
          };
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          activeStream = stream;
          setLocalStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.warn('Failed to access media devices:', err);
        }
      }
    };

    startMedia();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      setLocalStream(null);
    };
  }, [callState, callType, remoteUserConnected, isCameraOff]);

  // 2. Outgoing call auto-transition to active (simulating user pickup)
  useEffect(() => {
    let timeoutId: number;
    if (callState === 'outgoing' && remoteUserConnected) {
      timeoutId = window.setTimeout(() => {
        acceptCall();
        toast.info(`Call connected with ${remoteUserName}`);
      }, 4000); // Connect after 4s
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [callState, remoteUserConnected, acceptCall, remoteUserName]);

  // 3. Call Duration Timer
  useEffect(() => {
    if (callState === 'active') {
      timerRef.current = window.setInterval(() => {
        incrementDuration();
      }, 1000) as unknown as number;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [callState, incrementDuration]);

  // Helper: format duration
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Helper: send meeting link to recipient
  const handleSendLink = async () => {
    if (!accessToken) {
      toast.error('You are not connected to Google Meet. Please connect first.');
      return;
    }
    setGeneratingLink(true);
    try {
      const meetData = await googleMeetService.createInstantMeeting(accessToken);
      if (onSendMessage && meetData.meetingUri) {
        await onSendMessage(`I created a Google Meet call. Let's connect here: ${meetData.meetingUri}`);
        toast.success('Google Meet link sent to chat!');
      } else {
        toast.error('Could not send the link. Make sure chat is active.');
      }
      endCall();
    } catch (err) {
      toast.error('Failed to create Google Meet link.');
    } finally {
      setGeneratingLink(false);
    }
  };

  if (callState === 'idle') return null;

  // Render Overlay
  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur-md z-50 flex flex-col items-center justify-between p-6 select-none animate-in fade-in duration-200">

      {/* Top section: Header */}
      <div className="w-full flex items-center justify-between text-muted-foreground text-sm max-w-lg">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-primary animate-pulse" />
          <span>Encrypted Calling</span>
        </div>
        {callState === 'active' && (
          <span className="font-mono text-foreground font-semibold bg-primary/10 px-2 py-0.5 rounded-full">
            {formatTime(callDuration)}
          </span>
        )}
      </div>

      {/* Middle section: User details & stream/state */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full max-w-lg">

        {/* Recipient Not Connected Alert */}
        {callState === 'outgoing' && !remoteUserConnected ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 text-center max-w-sm flex flex-col items-center gap-4 animate-in zoom-in-95">
            <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center text-destructive">
              <PhoneOff className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1 text-base">Recipient Not Connected</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Invalid call as {remoteUserName} hasn't connected to the Google Meet integration. Please send them a link instead.
              </p>
            </div>
            <div className="flex gap-2 w-full mt-2">
              <Button
                variant="outline"
                className="flex-1 border-border"
                onClick={endCall}
                disabled={generatingLink}
              >
                Close
              </Button>
              <Button
                variant="default"
                className="flex-1 gap-2"
                onClick={handleSendLink}
                disabled={generatingLink}
              >
                {generatingLink ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Link
              </Button>
            </div>
          </div>
        ) : (
          /* Normal calling UI states */
          <div className="relative w-full flex flex-col items-center gap-6">

            {/* Avatar / Video Preview Container */}
            <div className="relative h-48 w-48 md:h-56 md:w-56 rounded-full overflow-hidden border-2 border-primary/20 bg-muted shadow-2xl flex items-center justify-center">

              {callType === 'video' && !isCameraOff && localStream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <Avatar className="h-full w-full rounded-none">
                  <AvatarFallback className="text-4xl font-semibold bg-gradient-to-br from-primary/10 to-primary/20 text-primary">
                    {remoteUserName?.slice(0, 2).toUpperCase() || '??'}
                  </AvatarFallback>
                </Avatar>
              )}

              {/* Pulsing rings for incoming/outgoing call */}
              {(callState === 'outgoing' || callState === 'incoming') && (
                <div className="absolute inset-0 rounded-full border-2 border-primary/60 animate-ping opacity-25 pointer-events-none" />
              )}
            </div>

            {/* Calling details */}
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">{remoteUserName}</h2>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest text-xs flex items-center justify-center gap-1.5">
                {callType === 'video' ? (
                  <Video className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Phone className="h-3.5 w-3.5 text-primary" />
                )}
                {callState === 'outgoing' && 'Trying to connect...'}
                {callState === 'incoming' && `Incoming ${callType} call`}
                {callState === 'active' && `Active ${callType} call`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom section: Actions/Buttons */}
      <div className="w-full max-w-lg flex flex-col items-center gap-4">
        {/* Accept/Decline (Incoming Call) */}
        {callState === 'incoming' && (
          <div className="flex gap-4 w-full justify-center">
            <Button
              size="lg"
              variant="destructive"
              className="h-14 w-14 rounded-full p-0 flex items-center justify-center shadow-lg hover:shadow-destructive/20 hover:scale-105 transition-all"
              onClick={declineCall}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              size="lg"
              className="h-14 w-14 rounded-full p-0 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 shadow-lg hover:shadow-emerald-600/20 hover:scale-105 transition-all text-white"
              onClick={acceptCall}
            >
              <Phone className="h-6 w-6" />
            </Button>
          </div>
        )}

        {/* End Call / Active Call Controls */}
        {(callState === 'outgoing' || callState === 'active') && remoteUserConnected && (
          <div className="flex flex-col items-center gap-4 w-full">

            {/* Control toggles (Active Call only) */}
            {callState === 'active' && (
              <div className="flex items-center gap-3 mb-2">
                <Button
                  variant="outline"
                  size="icon"
                  className={`h-11 w-11 rounded-full border-border hover:bg-muted ${isMuted ? 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/25' : ''
                    }`}
                  onClick={toggleMute}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>

                {callType === 'video' && (
                  <Button
                    variant="outline"
                    size="icon"
                    className={`h-11 w-11 rounded-full border-border hover:bg-muted ${isCameraOff ? 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/25' : ''
                      }`}
                    onClick={toggleCamera}
                    title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
                  >
                    {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                  </Button>
                )}
              </div>
            )}

            {/* Hangup button */}
            <Button
              size="lg"
              variant="destructive"
              className="h-14 w-14 rounded-full p-0 flex items-center justify-center shadow-lg hover:shadow-destructive/25 hover:scale-105 transition-all"
              onClick={endCall}
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
