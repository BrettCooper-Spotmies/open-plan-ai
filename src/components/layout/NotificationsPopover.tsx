import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MessageSquare, CheckCircle2, AlertCircle, Users, FolderKanban, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Notification {
    id: string;
    type: 'mention' | 'assignment' | 'completed' | 'comment' | 'deadline';
    title: string;
    description: string;
    avatar: string | null;
    initials: string | null;
    time: string;
    read: boolean;
    project: string;
}

// Mock notifications data
const mockNotifications: Notification[] = [
    {
        id: '1',
        type: 'mention',
        title: 'Mentioned you in a comment',
        description: 'Sarah mentioned you in "API Integration Task"',
        avatar: null,
        initials: 'SK',
        time: '2 min ago',
        read: false,
        project: 'Mobile App Redesign',
    },
    {
        id: '2',
        type: 'assignment',
        title: 'New task assigned',
        description: 'You have been assigned to "Database Schema Review"',
        avatar: null,
        initials: 'MJ',
        time: '15 min ago',
        read: false,
        project: 'Backend Infrastructure',
    },
    {
        id: '3',
        type: 'completed',
        title: 'Task completed',
        description: 'James marked "User Authentication" as done',
        avatar: null,
        initials: 'JW',
        time: '1 hour ago',
        read: true,
        project: 'Mobile App Redesign',
    },
    {
        id: '4',
        type: 'comment',
        title: 'New comment',
        description: 'Emily replied to your comment on "Dashboard Widgets"',
        avatar: null,
        initials: 'EC',
        time: '2 hours ago',
        read: true,
        project: 'Analytics Platform',
    },
    {
        id: '5',
        type: 'deadline',
        title: 'Deadline approaching',
        description: '"Sprint Review Preparation" is due tomorrow',
        avatar: null,
        initials: null,
        time: '3 hours ago',
        read: true,
        project: 'Q1 Planning',
    },
];

const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
        case 'mention':
            return <Users className="h-4 w-4 text-blue-500" />;
        case 'assignment':
            return <FolderKanban className="h-4 w-4 text-purple-500" />;
        case 'completed':
            return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        case 'comment':
            return <MessageSquare className="h-4 w-4 text-orange-500" />;
        case 'deadline':
            return <AlertCircle className="h-4 w-4 text-red-500" />;
        default:
            return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
};

export function NotificationsPopover() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const markAsRead = (id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-status-in-progress rounded-full flex items-center justify-center">
                            <span className="text-[10px] font-medium text-white">{unreadCount}</span>
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96 p-0">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                            <span className="bg-status-in-progress/10 text-status-in-progress text-xs font-medium px-2 py-0.5 rounded-full">
                                {unreadCount} new
                            </span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 text-muted-foreground hover:text-foreground"
                            onClick={markAllAsRead}
                        >
                            Mark all as read
                        </Button>
                    )}
                </div>

                {/* Notifications List */}
                <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4">
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                <Bell className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium text-foreground">No notifications yet</p>
                            <p className="text-xs text-muted-foreground mt-1">We'll notify you when something arrives</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {notifications.map((notification) => (
                                <button
                                    key={notification.id}
                                    className={cn(
                                        'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                                        !notification.read && 'bg-status-in-progress/5'
                                    )}
                                    onClick={() => markAsRead(notification.id)}
                                >
                                    {/* Icon or Avatar */}
                                    <div className="flex-shrink-0 mt-0.5">
                                        {notification.initials ? (
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                                    {notification.initials}
                                                </AvatarFallback>
                                            </Avatar>
                                        ) : (
                                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={cn(
                                                'text-sm line-clamp-1',
                                                !notification.read ? 'font-medium text-foreground' : 'text-muted-foreground'
                                            )}>
                                                {notification.title}
                                            </p>
                                            {!notification.read && (
                                                <span className="flex-shrink-0 h-2 w-2 bg-status-in-progress rounded-full mt-1.5" />
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                            {notification.description}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                <FolderKanban className="h-2.5 w-2.5" />
                                                {notification.project}
                                            </span>
                                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                <Clock className="h-2.5 w-2.5" />
                                                {notification.time}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                    <div className="border-t border-border p-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs h-8 text-muted-foreground hover:text-foreground"
                            onClick={() => navigate('/notifications')}
                        >
                            View all notifications
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
