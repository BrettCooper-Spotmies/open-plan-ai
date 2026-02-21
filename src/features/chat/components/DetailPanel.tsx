import { useState, useEffect } from 'react';
import { X, Bell, LogOut, FileText, UserPlus, UserMinus, Download, Image } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OnlineStatus } from './OnlineStatus';
import { Conversation, ReachableUser } from '../types';
import { useAuth } from '@/contexts/AuthContext';
import { useChatStore } from '../stores/useChatStore';
import { chatService } from '@/services/chat.service';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface SharedFile {
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  createdAt: string;
}

interface DetailPanelProps {
  conversation: Conversation;
  onRefetch?: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function DetailPanel({ conversation, onRefetch }: DetailPanelProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentUserId = user?.id;
  const setDetailPanelOpen = useChatStore((s) => s.setDetailPanelOpen);
  const isGroup = conversation.type === 'group';

  const currentMember = conversation.members.find((m) => m.id === currentUserId);
  const isAdminOrOwner = currentMember?.role === 'owner' || currentMember?.role === 'admin';

  // Shared files
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  // Add member dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [reachableUsers, setReachableUsers] = useState<ReachableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    setFilesLoading(true);
    chatService.getSharedFiles(conversation.id)
      .then(setSharedFiles)
      .catch(() => {})
      .finally(() => setFilesLoading(false));
  }, [conversation.id]);

  const handleAddMember = async (userId: string) => {
    try {
      await chatService.addMemberToGroup(conversation.id, userId);
      toast.success('Member added');
      setAddDialogOpen(false);
      onRefetch?.();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('Remove this member from the group?')) return;
    try {
      await chatService.removeMemberFromGroup(conversation.id, userId);
      toast.success('Member removed');
      onRefetch?.();
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove member');
    }
  };

  const handleLeaveGroup = async () => {
    if (!currentUserId || !window.confirm('Leave this group?')) return;
    try {
      await chatService.removeMemberFromGroup(conversation.id, currentUserId);
      toast.success('You left the group');
      onRefetch?.();
      navigate('/chat');
    } catch (err) {
      console.error(err);
      toast.error('Failed to leave group');
    }
  };

  const openAddDialog = async () => {
    setAddDialogOpen(true);
    setLoadingUsers(true);
    try {
      const users = await chatService.getReachableUsers();
      const existingIds = new Set(conversation.members.map((m) => m.id));
      setReachableUsers(users.filter((u) => !existingIds.has(u.id)));
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

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
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-medium text-muted-foreground">
                Members ({conversation.members.length})
              </h5>
              {isGroup && isAdminOrOwner && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={openAddDialog} title="Add member">
                  <UserPlus className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {conversation.members.map((member) => (
                <div key={member.id} className="flex items-center gap-2 group">
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
                  {isGroup && isAdminOrOwner && member.id !== currentUserId && member.role !== 'owner' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveMember(member.id)}
                      title="Remove member"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Shared Files */}
          <div>
            <h5 className="text-xs font-medium text-muted-foreground mb-2">Shared Files</h5>
            {filesLoading ? (
              <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
            ) : sharedFiles.length === 0 ? (
              <div className="flex flex-col items-center py-4 text-center">
                <FileText className="h-8 w-8 text-muted-foreground/40 mb-1" />
                <p className="text-xs text-muted-foreground">No shared files yet</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {sharedFiles.map((file, i) => {
                  const isImage = file.mimeType?.startsWith('image/');
                  return (
                    <a
                      key={i}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors"
                    >
                      {isImage ? (
                        <Image className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{file.fileName}</p>
                        <p className="text-[10px] text-muted-foreground">{formatFileSize(file.fileSize)}</p>
                      </div>
                      <Download className="h-3 w-3 text-muted-foreground shrink-0" />
                    </a>
                  );
                })}
              </div>
            )}
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
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={handleLeaveGroup}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Leave Group
              </Button>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Add Member Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
          </DialogHeader>
          {loadingUsers ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading users...</p>
          ) : reachableUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No more users to add</p>
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {reachableUsers.map((u) => (
                <button
                  key={u.id}
                  className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted transition-colors text-left"
                  onClick={() => handleAddMember(u.id)}
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px]">{u.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
