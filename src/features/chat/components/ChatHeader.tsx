import { ArrowLeft, Info, Phone, Search, Video } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { OnlineStatus } from './OnlineStatus';
import { Conversation } from '../types';
import { useAuth } from '@/contexts/AuthContext';
import { useChatStore } from '../stores/useChatStore';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  conversation: Conversation;
  onBack?: () => void;
}

export function ChatHeader({ conversation, onBack }: ChatHeaderProps) {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const toggleDetailPanel = useChatStore((s) => s.toggleDetailPanel);
  const isDetailOpen = useChatStore((s) => s.isDetailPanelOpen);

  const otherMember = conversation.type === 'dm'
    ? conversation.members.find((m) => m.id !== currentUserId)
    : null;

  const displayName = conversation.type === 'dm' ? otherMember?.name || conversation.name : conversation.name;
  const initials = conversation.type === 'dm'
    ? otherMember?.initials || '??'
    : conversation.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
      {onBack && (
        <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}

      <div className="relative">
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
        <h3 className="text-sm font-semibold truncate">{displayName}</h3>
        <p className="text-xs text-muted-foreground">
          {conversation.type === 'dm'
            ? otherMember?.isOnline ? 'Online' : 'Offline'
            : `${conversation.members.length} members`
          }
        </p>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Search"><Search className="h-4 w-4" /></Button>
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
