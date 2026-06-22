import { ArrowLeft, Info, Phone, Search, UserPlus, Video } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { OnlineStatus } from './OnlineStatus';
import { Conversation } from '../types';
import { useAuth } from '@/contexts/AuthContext';
import { useChatStore } from '../stores/useChatStore';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';

interface ChatHeaderProps {
  conversation: Conversation;
  onBack?: () => void;
  onlineUserIds?: Set<string>;
  typingText?: string;
  onAddMember?: () => void;
}

export function ChatHeader({ conversation, onBack, onlineUserIds, typingText, onAddMember }: ChatHeaderProps) {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const toggleDetailPanel = useChatStore((s) => s.toggleDetailPanel);
  const setDetailPanelOpen = useChatStore((s) => s.setDetailPanelOpen);
  const isDetailOpen = useChatStore((s) => s.isDetailPanelOpen);

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

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
      {onBack && (
        <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}

      <div
        className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer hover:bg-accent/50 p-1 -ml-1 rounded-lg transition-colors group"
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

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Search" onClick={() => useChatStore.getState().toggleMessageSearch()}><Search className="h-4 w-4" /></Button>
        {conversation.type === 'group' && isOwner && onAddMember && (
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Add member" onClick={onAddMember}>
            <UserPlus className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled title="Voice call"><Phone className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled title="Video call"><Video className="h-4 w-4" /></Button>
        <Button
          variant={isDetailOpen ? 'secondary' : 'ghost'}
          size="icon" className="h-8 w-8"
          onClick={toggleDetailPanel}
          title="Conversation details"
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
