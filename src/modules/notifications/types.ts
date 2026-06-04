export type NotificationKind =
  | 'task_assigned'
  | 'task_completed'
  | 'task_commented'
  | 'milestone_completed'
  | 'milestone_due_soon'
  | 'issue_created'
  | 'issue_updated'
  | 'project_updated'
  | 'member_invited'
  | 'member_joined';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
  actor?: {
    id: string;
    name: string;
    avatar?: string;
  };
  meta?: Record<string, unknown>;
}

export interface NotificationStore {
  unreadCount: number;
  setUnreadCount: (n: number) => void;
  decrementUnread: () => void;
  clearUnread: () => void;
}
