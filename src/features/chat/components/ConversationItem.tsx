import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { OnlineStatus } from './OnlineStatus';
import { UnreadBadge } from './UnreadBadge';
import { Conversation } from '../types';
import { CURRENT_USER_ID } from '../mockData';
import { formatDistanceToNowStrict } from 'date-fns';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  unreadCount: number;
  onClick: () => void;
}

export function ConversationItem({ conversation, isActive, unreadCount, onClick }: ConversationItemProps) {
  const otherMember = conversation.type === 'dm'
    ? conversation.members.find((m) => m.id !== CURRENT_USER_ID)
    : null;

  const displayName = conversation.type === 'dm' ? otherMember?.name || conversation.name : conversation.name;
  const initials = conversation.type === 'dm'
    ? otherMember?.initials || '??'
    : conversation.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const timeAgo = conversation.lastMessage
    ? formatDistanceToNowStrict(new Date(conversation.lastMessage.createdAt), { addSuffix: false })
        .replace(' seconds', 's').replace(' second', 's')
        .replace(' minutes', 'm').replace(' minute', 'm')
        .replace(' hours', 'h').replace(' hour', 'h')
        .replace(' days', 'd').replace(' day', 'd')
    : '';

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-2.5 text-left rounded-md transition-colors',
        isActive ? 'bg-accent' : 'hover:bg-accent/50'
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-9 w-9">
          <AvatarFallback className={cn('text-xs font-medium', conversation.type === 'group' && 'bg-primary/10 text-primary')}>
            {initials}
          </AvatarFallback>
        </Avatar>
        {conversation.type === 'dm' && otherMember && (
          <OnlineStatus isOnline={otherMember.isOnline} className="absolute -bottom-0.5 -right-0.5" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={cn('text-sm truncate', unreadCount > 0 ? 'font-semibold' : 'font-medium')}>
            {displayName}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{timeAgo}</span>
        </div>
        {conversation.lastMessage && (
          <p className={cn('text-xs truncate mt-0.5', unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground')}>
            {conversation.type === 'group' && `${conversation.lastMessage.senderName}: `}
            {conversation.lastMessage.content}
          </p>
        )}
      </div>

      <UnreadBadge count={unreadCount} />
    </button>
  );
}
