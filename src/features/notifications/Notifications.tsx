import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Bell,
    MessageSquare,
    CheckCircle2,
    AlertCircle,
    Users,
    FolderKanban,
    Clock,
    MoreHorizontal,
    Check,
    Trash2,
    BellOff,
    Filter,
    CheckCheck,
} from 'lucide-react';
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
    createdAt: Date;
}

// Mock notifications data
const mockNotifications: Notification[] = [
    {
        id: '1',
        type: 'mention',
        title: 'Mentioned you in a comment',
        description: 'Sarah mentioned you in "API Integration Task" - "Hey, can you take a look at the API endpoints?"',
        avatar: null,
        initials: 'SK',
        time: '2 min ago',
        read: false,
        project: 'Mobile App Redesign',
        createdAt: new Date(Date.now() - 2 * 60 * 1000),
    },
    {
        id: '2',
        type: 'assignment',
        title: 'New task assigned',
        description: 'You have been assigned to "Database Schema Review" by Michael Johnson',
        avatar: null,
        initials: 'MJ',
        time: '15 min ago',
        read: false,
        project: 'Backend Infrastructure',
        createdAt: new Date(Date.now() - 15 * 60 * 1000),
    },
    {
        id: '3',
        type: 'completed',
        title: 'Task completed',
        description: 'James marked "User Authentication" as done in Mobile App Redesign project',
        avatar: null,
        initials: 'JW',
        time: '1 hour ago',
        read: true,
        project: 'Mobile App Redesign',
        createdAt: new Date(Date.now() - 60 * 60 * 1000),
    },
    {
        id: '4',
        type: 'comment',
        title: 'New comment on your task',
        description: 'Emily replied to your comment on "Dashboard Widgets" - "Great suggestion, I\'ll implement that!"',
        avatar: null,
        initials: 'EC',
        time: '2 hours ago',
        read: true,
        project: 'Analytics Platform',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
        id: '5',
        type: 'deadline',
        title: 'Deadline approaching',
        description: '"Sprint Review Preparation" is due tomorrow. Make sure to complete all pending items.',
        avatar: null,
        initials: null,
        time: '3 hours ago',
        read: true,
        project: 'Q1 Planning',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
    {
        id: '6',
        type: 'mention',
        title: 'Mentioned in project discussion',
        description: 'Alex tagged you in the project discussion about deployment strategy',
        avatar: null,
        initials: 'AT',
        time: '5 hours ago',
        read: true,
        project: 'Backend Infrastructure',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
    {
        id: '7',
        type: 'assignment',
        title: 'Task reassigned to you',
        description: '"Performance Optimization" was reassigned to you from David Chen',
        avatar: null,
        initials: 'DC',
        time: 'Yesterday',
        read: true,
        project: 'Analytics Platform',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
        id: '8',
        type: 'completed',
        title: 'Sprint completed',
        description: 'Sprint 12 has been completed. 23 tasks done, 2 carried over.',
        avatar: null,
        initials: null,
        time: '2 days ago',
        read: true,
        project: 'Mobile App Redesign',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
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

const getNotificationTypeLabel = (type: Notification['type']) => {
    switch (type) {
        case 'mention':
            return 'Mention';
        case 'assignment':
            return 'Assignment';
        case 'completed':
            return 'Completed';
        case 'comment':
            return 'Comment';
        case 'deadline':
            return 'Deadline';
        default:
            return 'Notification';
    }
};

const Notifications = () => {
    const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
    const [activeTab, setActiveTab] = useState('all');

    const unreadCount = notifications.filter((n) => !n.read).length;

    const filteredNotifications = notifications.filter((n) => {
        if (activeTab === 'all') return true;
        if (activeTab === 'unread') return !n.read;
        return n.type === activeTab;
    });

    const markAsRead = (id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const deleteNotification = (id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    const clearAllRead = () => {
        setNotifications((prev) => prev.filter((n) => !n.read));
    };

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
                        <p className="text-muted-foreground">
                            Stay updated with your team's activity
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <Button variant="outline" size="sm" onClick={markAllAsRead}>
                                <CheckCheck className="h-4 w-4 mr-2" />
                                Mark all as read
                            </Button>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Filter className="h-4 w-4 mr-2" />
                                    Actions
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={clearAllRead}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Clear read notifications
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <BellOff className="h-4 w-4 mr-2" />
                                    Notification settings
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <Bell className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{notifications.length}</p>
                                <p className="text-xs text-muted-foreground">Total</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-status-in-progress/10">
                                <Bell className="h-5 w-5 text-status-in-progress" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{unreadCount}</p>
                                <p className="text-xs text-muted-foreground">Unread</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <Users className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {notifications.filter((n) => n.type === 'mention').length}
                                </p>
                                <p className="text-xs text-muted-foreground">Mentions</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/10">
                                <FolderKanban className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {notifications.filter((n) => n.type === 'assignment').length}
                                </p>
                                <p className="text-xs text-muted-foreground">Assignments</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="all">
                            All
                            {notifications.length > 0 && (
                                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                                    {notifications.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="unread">
                            Unread
                            {unreadCount > 0 && (
                                <Badge className="ml-2 h-5 px-1.5 bg-status-in-progress">
                                    {unreadCount}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="mention">Mentions</TabsTrigger>
                        <TabsTrigger value="assignment">Assignments</TabsTrigger>
                        <TabsTrigger value="comment">Comments</TabsTrigger>
                    </TabsList>

                    <TabsContent value={activeTab} className="mt-4">
                        {filteredNotifications.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-16">
                                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                        <Bell className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-medium text-foreground">No notifications</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {activeTab === 'unread'
                                            ? "You're all caught up!"
                                            : "You don't have any notifications yet"}
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <div className="divide-y divide-border">
                                    {filteredNotifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={cn(
                                                'flex items-start gap-4 p-4 transition-colors hover:bg-muted/50',
                                                !notification.read && 'bg-status-in-progress/5'
                                            )}
                                        >
                                            {/* Icon or Avatar */}
                                            <div className="flex-shrink-0 mt-1">
                                                {notification.initials ? (
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                                                            {notification.initials}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                                        {getNotificationIcon(notification.type)}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p
                                                                className={cn(
                                                                    'text-sm',
                                                                    !notification.read
                                                                        ? 'font-semibold text-foreground'
                                                                        : 'font-medium text-foreground'
                                                                )}
                                                            >
                                                                {notification.title}
                                                            </p>
                                                            {!notification.read && (
                                                                <span className="h-2 w-2 bg-status-in-progress rounded-full" />
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                            {notification.description}
                                                        </p>
                                                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                            <Badge variant="outline" className="text-xs">
                                                                {getNotificationTypeLabel(notification.type)}
                                                            </Badge>
                                                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                                                <FolderKanban className="h-3 w-3" />
                                                                {notification.project}
                                                            </span>
                                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                <Clock className="h-3 w-3" />
                                                                {notification.time}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {!notification.read && (
                                                                <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                                                                    <Check className="h-4 w-4 mr-2" />
                                                                    Mark as read
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem
                                                                className="text-destructive"
                                                                onClick={() => deleteNotification(notification.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
};

export default Notifications;
