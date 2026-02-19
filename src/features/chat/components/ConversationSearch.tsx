import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useChatStore } from '../stores/useChatStore';

export function ConversationSearch() {
  const searchQuery = useChatStore((s) => s.searchQuery);
  const setSearchQuery = useChatStore((s) => s.setSearchQuery);

  return (
    <div className="relative px-3 py-2">
      <Search className="absolute left-5.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search conversations..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-8 h-8 text-sm"
      />
    </div>
  );
}
