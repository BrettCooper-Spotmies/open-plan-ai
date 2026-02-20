import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ChatMessage } from '../types';
import { toast } from 'sonner';

interface MessageBubbleProps {
  message: ChatMessage;
  showSenderInfo: boolean;
  showTimestamp: boolean;
  isGroupChat: boolean;
  currentUserId?: string;
}

export function MessageBubble({ message, showSenderInfo, showTimestamp, isGroupChat, currentUserId }: MessageBubbleProps) {
  const isOwn = message.senderId === currentUserId;

  return (
    <div className={cn('flex gap-2 px-4 group', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar – only show spacer in group chats */}
      {isGroupChat && (
        <div className="w-8 shrink-0">
          {showSenderInfo && !isOwn && (
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-[10px]">{message.senderInitials}</AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div className={cn('flex flex-col max-w-[70%]', isOwn ? 'items-end' : 'items-start')}>
        {showSenderInfo && !isOwn && isGroupChat && (
          <span className="text-xs text-muted-foreground font-medium mb-0.5 px-1">{message.senderName}</span>
        )}

        <div className="relative flex items-center gap-1">
          {/* Hover actions */}
          <div className={cn(
            'hidden group-hover:flex items-center gap-0.5 absolute top-0',
            isOwn ? 'right-full mr-1' : 'left-full ml-1'
          )}>
            <Button
              variant="ghost" size="icon" className="h-6 w-6"
              onClick={() => { navigator.clipboard.writeText(message.content); toast.success('Copied'); }}
            >
              <Copy className="h-3 w-3" />
            </Button>
            {isOwn && (
              <>
                <Button variant="ghost" size="icon" className="h-6 w-6"><Pencil className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"><Trash2 className="h-3 w-3" /></Button>
              </>
            )}
          </div>

          <div
            className={cn(
              'rounded-2xl px-3 py-2 text-sm leading-relaxed',
              isOwn
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-muted text-foreground rounded-bl-md'
            )}
          >
            {message.content}
          </div>
        </div>

        {showTimestamp && (
          <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
            {format(new Date(message.createdAt), 'h:mm a')}
            {message.isEdited && ' (edited)'}
          </span>
        )}
      </div>
    </div>
  );
}
