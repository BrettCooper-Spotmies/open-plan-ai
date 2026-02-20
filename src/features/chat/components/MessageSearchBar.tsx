import { useRef, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChatStore } from '../stores/useChatStore';

export function MessageSearchBar() {
  const { messageSearchQuery, setMessageSearchQuery, toggleMessageSearch } = useChatStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
      <Search className="h-4 w-4 text-muted-foreground shrink-0" />
      <Input
        ref={inputRef}
        value={messageSearchQuery}
        onChange={(e) => setMessageSearchQuery(e.target.value)}
        placeholder="Search in conversation..."
        className="h-8 text-sm border-none bg-transparent shadow-none focus-visible:ring-0"
      />
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={toggleMessageSearch}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
