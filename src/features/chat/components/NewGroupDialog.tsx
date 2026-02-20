import { useState, useMemo, useEffect } from 'react';
import { Search, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { chatService } from '@/services/chat.service';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ReachableUser } from '../types';

interface NewGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (conversationId: string) => void;
}

export function NewGroupDialog({ open, onOpenChange, onSelect }: NewGroupDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<ReachableUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    chatService
      .getReachableUsers()
      .then(setUsers)
      .catch((err) => {
        console.error('Failed to fetch users:', err);
        toast.error('Failed to load users');
      })
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => u.name.toLowerCase().includes(q));
  }, [search, users]);

  const toggleUser = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    try {
      const convId = await chatService.createGroup(
        name,
        description || undefined,
        Array.from(selectedIds)
      );
      toast.success(`Group "${name}" created`);
      reset();
      onOpenChange(false);
      onSelect(convId);
    } catch (err) {
      console.error('Failed to create group:', err);
      toast.error('Failed to create group');
    }
  };

  const reset = () => {
    setStep(1);
    setName('');
    setDescription('');
    setSelectedIds(new Set());
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{step === 1 ? 'Create Group' : 'Add Members'}</DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Group Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Design Team" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this group about?" rows={2} />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search members..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="max-h-[240px] overflow-y-auto space-y-1">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3.5 w-20" />
                      <Skeleton className="h-3 w-14" />
                    </div>
                  </div>
                ))
              ) : (
                filtered.map((user) => {
                  const checked = selectedIds.has(user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => toggleUser(user.id)}
                      className={cn('flex items-center gap-3 w-full px-3 py-2 rounded-md transition-colors text-left', checked ? 'bg-accent' : 'hover:bg-accent/50')}
                    >
                      <Checkbox checked={checked} />
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[10px]">{user.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block truncate">{user.name}</span>
                        <span className="text-xs text-muted-foreground">{user.role}</span>
                      </div>
                      {checked && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
            {selectedIds.size > 0 && (
              <p className="text-xs text-muted-foreground">{selectedIds.size} member{selectedIds.size > 1 ? 's' : ''} selected</p>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
          )}
          {step === 1 ? (
            <Button onClick={() => setStep(2)} disabled={!name.trim()}>Next</Button>
          ) : (
            <Button onClick={handleCreate} disabled={selectedIds.size === 0}>Create Group</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
