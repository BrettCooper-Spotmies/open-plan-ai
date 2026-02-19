import { useState, useMemo } from 'react';
import { Search, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { mockReachableUsers } from '../mockData';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NewGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewGroupDialog({ open, onOpenChange }: NewGroupDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const users = useMemo(() => {
    const q = search.toLowerCase();
    return mockReachableUsers.filter((u) => u.name.toLowerCase().includes(q));
  }, [search]);

  const toggleUser = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = () => {
    toast.success(`Group "${name}" created (mock)`);
    reset();
    onOpenChange(false);
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
              {users.map((user) => {
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
              })}
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
