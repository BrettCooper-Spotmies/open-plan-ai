import { X, Bell, LogOut, FileText } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { OnlineStatus } from './OnlineStatus';
import { Conversation } from '../types';
import { useAuth } from '@/contexts/AuthContext';
import { useChatStore } from '../stores/useChatStore';
import { cn } from '@/lib/utils';

interface DetailPanelProps {
  conversation: Conversation;
}

export function DetailPanel({ conversation }: DetailPanelProps) {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const setDetailPanelOpen = useChatStore((s) => s.setDetailPanelOpen);
  const isGroup = conversation.type === 'group';

  return (
    <div className="flex flex-col h-full border-l border-border w-[280px] shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Details</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailPanelOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Info */}
          <div className="text-center">
            <Avatar className="h-16 w-16 mx-auto">
              <AvatarFallback className={cn('text-lg font-semibold', isGroup && 'bg-primary/10 text-primary')}>
                {isGroup
                  ? conversation.name.split(' ').map((w) => w[0]).join('').slice(0, 2)
                  : conversation.members.find((m) => m.id !== currentUserId)?.initials || '??'}
              </AvatarFallback>
            </Avatar>
            <h4 className="font-semibold mt-2">{conversation.name}</h4>
            {conversation.description && (
              <p className="text-xs text-muted-foreground mt-1">{conversation.description}</p>
            )}
          </div>

          <Separator />

          {/* Members */}
          <div>
            <h5 className="text-xs font-medium text-muted-foreground mb-2">
              Members ({conversation.members.length})
            </h5>
            <div className="space-y-2">
              {conversation.members.map((member) => (
                <div key={member.id} className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px]">{member.initials}</AvatarFallback>
                    </Avatar>
                    <OnlineStatus isOnline={member.isOnline} className="absolute -bottom-0.5 -right-0.5" size="sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm truncate block">
                      {member.id === currentUserId ? 'You' : member.name}
                    </span>
                  </div>
                  {isGroup && member.role !== 'member' && (
                    <Badge variant="outline" className="text-[10px] h-5">{member.role}</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Shared Files */}
          <div>
            <h5 className="text-xs font-medium text-muted-foreground mb-2">Shared Files</h5>
            <div className="flex flex-col items-center py-4 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/40 mb-1" />
              <p className="text-xs text-muted-foreground">No shared files yet</p>
            </div>
          </div>

          <Separator />

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Notifications</span>
            </div>
            <Switch defaultChecked />
          </div>

          {isGroup && (
            <>
              <Separator />
              <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Leave Group
              </Button>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
