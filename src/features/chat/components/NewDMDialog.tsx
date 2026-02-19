import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { OnlineStatus } from './OnlineStatus';
import { mockReachableUsers, mockConversations, CURRENT_USER_ID } from '../mockData';
import { toast } from 'sonner';

interface NewDMDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (conversationId: string) => void;
}

export function NewDMDialog({ open, onOpenChange, onSelect }: NewDMDialogProps) {
  const [search, setSearch] = useState('');

  const users = useMemo(() => {
    const q = search.toLowerCase();
    return mockReachableUsers.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [search]);

  const handleSelect = (userId: string) => {
    // Check if DM already exists
    const existing = mockConversations.find(
      (c) => c.type === 'dm' && c.members.some((m) => m.id === userId)
    );
    if (existing) {
      onSelect(existing.id);
    } else {
      toast.success('New conversation started (mock)');
    }
    onOpenChange(false);
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search people..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="max-h-[300px] overflow-y-auto space-y-1 mt-2">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelect(user.id)}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-accent/50 transition-colors text-left"
            >
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{user.initials}</AvatarFallback>
                </Avatar>
                <OnlineStatus isOnline={user.isOnline} className="absolute -bottom-0.5 -right-0.5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium block truncate">{user.name}</span>
                <span className="text-xs text-muted-foreground block truncate">{user.role}</span>
              </div>
            </button>
          ))}
          {users.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No users found</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
