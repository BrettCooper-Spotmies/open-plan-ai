import { useMemo, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConversationSearch } from './ConversationSearch';
import { ConversationItem } from './ConversationItem';
import { NewDMDialog } from './NewDMDialog';
import { NewGroupDialog } from './NewGroupDialog';
import { EmptyState } from './EmptyState';
import { useChatStore } from '../stores/useChatStore';
import { mockConversations } from '../mockData';
import type { Conversation } from '../types';

interface ConversationListProps {
  onSelect: (id: string) => void;
}

export function ConversationList({ onSelect }: ConversationListProps) {
  const { activeConversationId, conversationFilter, setConversationFilter, searchQuery, unreadCounts } = useChatStore();
  const [dmDialogOpen, setDmDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    let list: Conversation[] = [...mockConversations];
    if (conversationFilter === 'dms') list = list.filter((c) => c.type === 'dm');
    if (conversationFilter === 'groups') list = list.filter((c) => c.type === 'group');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }, [conversationFilter, searchQuery]);

  return (
    <div className="flex flex-col h-full border-r border-border">
      <div className="flex items-center justify-between px-3 py-3 border-b border-border">
        <h2 className="font-semibold text-sm">Messages</h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDmDialogOpen(true)} title="New Message">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setGroupDialogOpen(true)} title="New Group">
            <Users className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ConversationSearch />

      <div className="px-3 pb-2">
        <Tabs value={conversationFilter} onValueChange={(v) => setConversationFilter(v as 'all' | 'dms' | 'groups')}>
          <TabsList className="w-full h-8">
            <TabsTrigger value="all" className="text-xs flex-1">All</TabsTrigger>
            <TabsTrigger value="dms" className="text-xs flex-1">DMs</TabsTrigger>
            <TabsTrigger value="groups" className="text-xs flex-1">Groups</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1 min-w-0">
        <div className="px-1.5 pb-2 overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState type="no-conversations" />
          ) : (
            filtered.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={activeConversationId === conv.id}
                unreadCount={unreadCounts[conv.id] || 0}
                onClick={() => onSelect(conv.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <NewDMDialog open={dmDialogOpen} onOpenChange={setDmDialogOpen} onSelect={onSelect} />
      <NewGroupDialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen} />
    </div>
  );
}
