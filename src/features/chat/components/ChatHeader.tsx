import { ArrowLeft, Phone, Search, UserPlus, Video, X, CalendarDays, Link, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OnlineStatus } from './OnlineStatus';
import { Conversation } from '../types';
import { useAuth } from '@/contexts/AuthContext';
import { useChatStore } from '../stores/useChatStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { useEffect, useRef, useState } from 'react';

// New Imports for Google Meet Integration & Call state
import { useGoogleMeetStore } from '@/features/integrations/stores/useGoogleMeetStore';
import { useCallStore } from '../stores/useCallStore';
import { googleMeetService } from '@/services/googleMeet.service';
import { ScheduleMeetingDialog } from './ScheduleMeetingDialog';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface ChatHeaderProps {
  conversation: Conversation;
  onBack?: () => void;
  onlineUserIds?: Set<string>;
  typingText?: string;
  onAddMember?: () => void;
  onSendMessage?: (content: string) => Promise<void>;
}

export function ChatHeader({ 
  conversation, 
  onBack, 
  onlineUserIds, 
  typingText, 
  onAddMember,
  onSendMessage 
}: ChatHeaderProps) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const currentUserId = user?.id;
  const setDetailPanelOpen = useChatStore((s) => s.setDetailPanelOpen);

  const isMessageSearchOpen = useChatStore((s) => s.isMessageSearchOpen);
  const messageSearchQuery = useChatStore((s) => s.messageSearchQuery);
  const setMessageSearchQuery = useChatStore((s) => s.setMessageSearchQuery);
  const toggleMessageSearch = useChatStore((s) => s.toggleMessageSearch);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Google Meet & Call states
  const { isConnected, accessToken } = useGoogleMeetStore();
  const { startCall, simulateIncomingCall } = useCallStore();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  useEffect(() => {
    if (isMessageSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isMessageSearchOpen]);

  const currentMember = conversation.members.find((m) => m.id === currentUserId);
  const isOwner = currentMember?.role === 'owner';

  const otherMember = conversation.type === 'dm'
    ? conversation.members.find((m) => m.id !== currentUserId)
    : null;

  const isOtherOnline = otherMember ? onlineUserIds?.has(otherMember.id) ?? false : false;

  const displayName = conversation.type === 'dm' ? otherMember?.name || conversation.name : conversation.name;
  const isEmoji = (str: string) => {
    const emojiRegex = /(©|®|[ -㌀]|\ud83c[퀀-\udfff]|\ud83d[퀀-\udfff]|\ud83e[퀀-\udfff])/;
    return emojiRegex.test(str) && str.length <= 8;
  };

  const initials = conversation.type === 'dm'
    ? otherMember?.initials || otherMember?.name?.slice(0, 2).toUpperCase() || '??'
    : (conversation.name || conversation.title || 'GC').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const avatarUrl = conversation.type === 'dm' ? otherMember?.avatarUrl : conversation.avatarUrl;

  // Direct mock signaling trigger
  const handleInitiateCall = (type: 'audio' | 'video') => {
    if (!otherMember) {
      toast.error('Direct calls are only available in 1-on-1 direct messages.');
      return;
    }
    
    // Test rule: Bob Martinez simulates a user who hasn't connected Google Meet.
    // Everyone else (e.g. Alice Chen) is simulated as connected.
    const isRecipientConnected = otherMember.name !== 'Bob Martinez';
    startCall(otherMember.id, otherMember.name, type, isRecipientConnected);
  };

  // Generate an instant meeting link and send to chat
  const handleGenerateInstantLink = async () => {
    if (!accessToken) return;
    setGeneratingLink(true);
    const loadingToast = toast.loading('Generating Google Meet space...');
    try {
      const meetData = await googleMeetService.createInstantMeeting(accessToken);
      if (onSendMessage && meetData.meetingUri) {
        await onSendMessage(`I created an instant Google Meet call. Let's connect here: ${meetData.meetingUri}`);
        toast.dismiss(loadingToast);
        toast.success('Meeting link generated and posted to chat!');
      } else {
        toast.dismiss(loadingToast);
        toast.error('Failed to automatically send the meeting link to chat.');
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error('Failed to create instant Google Meet. Please try re-connecting your account.');
    } finally {
      setGeneratingLink(false);
    }
  };

  const renderCallButtons = () => {
    const isDisabled = !isConnected;
    const buttonClass = cn(
      "h-8 w-8 transition-opacity duration-200", 
      isDisabled && "opacity-40 cursor-not-allowed"
    );

    const callDropdown = (type: 'audio' | 'video') => {
      const Icon = type === 'audio' ? Phone : Video;
      const title = type === 'audio' ? 'Voice Call' : 'Video Call';
      
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className={buttonClass} disabled={isDisabled}>
              <Icon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem 
              onClick={() => handleInitiateCall(type)}
              className="gap-2 cursor-pointer font-medium"
            >
              <Icon className="h-4 w-4 text-primary" />
              Start {title} (In-App)
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={handleGenerateInstantLink}
              disabled={generatingLink}
              className="gap-2 cursor-pointer"
            >
              {generatingLink ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link className="h-4 w-4 text-emerald-500" />
              )}
              Generate Meeting Link
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={() => setScheduleOpen(true)}
              className="gap-2 cursor-pointer"
            >
              <CalendarDays className="h-4 w-4 text-indigo-500" />
              Schedule Meeting
            </DropdownMenuItem>

            {/* Simulated Incoming Call - Dev utility for testing/evaluating */}
            {import.meta.env.DEV && otherMember && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => simulateIncomingCall(otherMember.id, otherMember.name, type)}
                  className="gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  [Dev] Simulate Incoming {type === 'audio' ? 'Voice' : 'Video'} Call
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    };

    if (isDisabled) {
      return (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">
                <Button variant="ghost" size="icon" className={buttonClass} disabled>
                  <Phone className="h-4 w-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent align="end" className="max-w-[220px] text-xs">
              First connect to Google Meet in the integrations and then you can call.
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">
                <Button variant="ghost" size="icon" className={buttonClass} disabled>
                  <Video className="h-4 w-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent align="end" className="max-w-[220px] text-xs">
              First connect to Google Meet in the integrations and then you can call.
            </TooltipContent>
          </Tooltip>
        </>
      );
    }

    return (
      <>
        {callDropdown('audio')}
        {callDropdown('video')}
      </>
    );
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border min-h-[61px]">
      {onBack && (
        <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}

      <div
        className={cn(
          "flex items-center gap-3 cursor-pointer hover:bg-accent/50 p-1 -ml-1 rounded-lg transition-colors group",
          isMessageSearchOpen ? "shrink min-w-0 max-w-[130px] md:max-w-[200px]" : "flex-1 min-w-0"
        )}
        onClick={() => setDetailPanelOpen(true)}
      >
        <div className="relative shrink-0">
          <Avatar className="h-9 w-9 border border-border group-hover:border-primary/50 transition-colors">
            {avatarUrl && !isEmoji(avatarUrl) && (
              <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />
            )}
            <AvatarFallback className={cn('text-xs font-medium', conversation.type === 'group' && 'bg-primary/10 text-primary')}>
              {isEmoji(avatarUrl || '') ? avatarUrl : initials}
            </AvatarFallback>
          </Avatar>
          {conversation.type === 'dm' && otherMember && (
            <OnlineStatus isOnline={isOtherOnline} size="md" className="absolute -bottom-0.5 -right-0.5 z-10" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{displayName}</h3>
          <p className="text-xs text-muted-foreground truncate">
            {typingText
              ? typingText
              : conversation.type === 'dm'
                ? isOtherOnline
                  ? 'Online'
                  : otherMember?.lastSeenAt
                    ? `Last seen ${formatDistanceToNowStrict(new Date(otherMember.lastSeenAt), { addSuffix: true })}`
                    : 'Offline'
                : `${conversation.members.length} members`
            }
          </p>
        </div>
      </div>

      {isMessageSearchOpen && (
        <div className="flex-1 relative flex items-center min-w-0 animate-in fade-in zoom-in-95 duration-200">
           <Search className="h-4 w-4 text-muted-foreground absolute left-3" />
           <Input
             ref={searchInputRef}
             value={messageSearchQuery}
             onChange={(e) => setMessageSearchQuery(e.target.value)}
             placeholder="Search..."
             className="w-full h-9 pl-9 pr-9 bg-muted/30 focus-visible:bg-transparent transition-colors"
           />
           <Button 
             variant="ghost" 
             size="icon" 
             className="h-7 w-7 absolute right-1 text-muted-foreground hover:text-foreground" 
             onClick={toggleMessageSearch}
           >
             <X className="h-4 w-4" />
           </Button>
        </div>
      )}

      <div className="flex items-center gap-1 shrink-0">
        {!isMessageSearchOpen && (
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Search" onClick={() => toggleMessageSearch()}>
            <Search className="h-4 w-4" />
          </Button>
        )}
        {conversation.type === 'group' && (isMobile || isOwner) && onAddMember && (
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Add member" onClick={onAddMember}>
            <UserPlus className="h-4 w-4" />
          </Button>
        )}
        
        {/* Render voice/video call button triggers */}
        {conversation.type === 'dm' && renderCallButtons()}
      </div>

      {/* Schedule Dialog rendered here */}
      <ScheduleMeetingDialog
        conversation={conversation}
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onMeetingScheduled={onSendMessage}
      />
    </div>
  );
}
