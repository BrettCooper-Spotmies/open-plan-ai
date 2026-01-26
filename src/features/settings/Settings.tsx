import { useState, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { defaultUserSettings, workspaceSettings } from '@/data/mockData';
import { UserSettings, WorkspaceSettings } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Palette,
  Save,
  Upload,
  Gavel,
  ShieldAlert,
  Trash2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

// Extended interface for local state
interface ExtendedWorkspaceSettings extends WorkspaceSettings {
  companyName?: string;
  companySize?: string;
}

const Settings = () => {
  const [userSettings, setUserSettings] = useState<UserSettings>(defaultUserSettings);
  const [workspace, setWorkspace] = useState<ExtendedWorkspaceSettings>({
    ...workspaceSettings,
    companyName: 'OpenPlan AI',
    companySize: '10-50',
  });
  const [profile, setProfile] = useState({
    name: 'Anna Kowalski',
    email: 'anna.k@openplan.ai',
    initials: 'AK',
    role: 'Project Manager',
    bio: 'Experienced project manager specializing in hardware development projects.',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveGeneral = () => {
    toast.success('Workspace settings saved');
  };

  const handleSaveProfile = () => {
    toast.success('Profile updated successfully');
  };

  const handleSaveNotifications = () => {
    toast.success('Notification preferences saved');
  };

  const handleSaveAppearance = () => {
    toast.success('Appearance settings saved');
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size must be less than 2MB');
        return;
      }
      toast.success('Avatar updated successfully');
      // In a real app, we would upload the file here
    }
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      toast.error('Account deletion not implemented in this demo');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">
            Manage your workspace and personal preferences
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="general" className="gap-2">
              <SettingsIcon className="h-4 w-4 hidden sm:block" />
              General
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4 hidden sm:block" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4 hidden sm:block" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4 hidden sm:block" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="danger" className="gap-2 text-destructive data-[state=active]:text-destructive">
              <ShieldAlert className="h-4 w-4 hidden sm:block" />
              Danger
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Workspace Settings</CardTitle>
                <CardDescription>
                  Configure your workspace preferences and defaults
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="workspace-name">Workspace Name</Label>
                  <Input
                    id="workspace-name"
                    value={workspace.name}
                    onChange={(e) =>
                      setWorkspace({ ...workspace, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workspace-desc">Description</Label>
                  <Textarea
                    id="workspace-desc"
                    value={workspace.description}
                    onChange={(e) =>
                      setWorkspace({ ...workspace, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input
                      id="company-name"
                      value={workspace.companyName}
                      onChange={(e) =>
                        setWorkspace({ ...workspace, companyName: e.target.value })
                      }
                      placeholder="e.g. Acme Corp"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-size">Company Size</Label>
                    <Select
                      value={workspace.companySize}
                      onValueChange={(value) =>
                        setWorkspace({ ...workspace, companySize: value })
                      }
                    >
                      <SelectTrigger id="company-size">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10 employees</SelectItem>
                        <SelectItem value="10-50">10-50 employees</SelectItem>
                        <SelectItem value="50-200">50-200 employees</SelectItem>
                        <SelectItem value="200-500">200-500 employees</SelectItem>
                        <SelectItem value="500+">500+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select
                      value={workspace.timezone}
                      onValueChange={(value) =>
                        setWorkspace({ ...workspace, timezone: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">
                          Eastern Time (ET)
                        </SelectItem>
                        <SelectItem value="America/Chicago">
                          Central Time (CT)
                        </SelectItem>
                        <SelectItem value="America/Denver">
                          Mountain Time (MT)
                        </SelectItem>
                        <SelectItem value="America/Los_Angeles">
                          Pacific Time (PT)
                        </SelectItem>
                        <SelectItem value="Europe/London">
                          Greenwich Mean Time (GMT)
                        </SelectItem>
                        <SelectItem value="Europe/Paris">
                          Central European Time (CET)
                        </SelectItem>
                        <SelectItem value="Asia/Kolkata">
                          India Standard Time (IST)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date Format</Label>
                    <Select
                      value={workspace.dateFormat}
                      onValueChange={(value) =>
                        setWorkspace({ ...workspace, dateFormat: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleSaveGeneral}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information and avatar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20">
                      <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                        {profile.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/png, image/jpeg, image/gif"
                        onChange={handleFileChange}
                      />
                      <Button variant="outline" size="sm" onClick={handleAvatarClick}>
                        <Upload className="h-4 w-4 mr-2" />
                        Change Avatar
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG or GIF. Max 2MB.
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full-name">Full Name</Label>
                      <Input
                        id="full-name"
                        value={profile.name}
                        onChange={(e) =>
                          setProfile({ ...profile, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={profile.email}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role / Title</Label>
                    <Input
                      id="role"
                      value={profile.role}
                      onChange={(e) =>
                        setProfile({ ...profile, role: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profile.bio}
                      onChange={(e) =>
                        setProfile({ ...profile, bio: e.target.value })
                      }
                      rows={3}
                      placeholder="Tell us a bit about yourself..."
                    />
                  </div>
                  <Button onClick={handleSaveProfile}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Profile
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Email Notifications</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Task Assignments</Label>
                        <p className="text-sm text-muted-foreground">
                          When you're assigned to a task
                        </p>
                      </div>
                      <Switch
                        checked={userSettings.notifications.taskAssignments}
                        onCheckedChange={(checked) =>
                          setUserSettings({
                            ...userSettings,
                            notifications: {
                              ...userSettings.notifications,
                              taskAssignments: checked,
                            },
                          })
                        }
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Task Completions</Label>
                        <p className="text-sm text-muted-foreground">
                          When tasks you're following are completed
                        </p>
                      </div>
                      <Switch
                        checked={userSettings.notifications.taskCompletions}
                        onCheckedChange={(checked) =>
                          setUserSettings({
                            ...userSettings,
                            notifications: {
                              ...userSettings.notifications,
                              taskCompletions: checked,
                            },
                          })
                        }
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Comments & Mentions</Label>
                        <p className="text-sm text-muted-foreground">
                          When someone mentions you or comments on your tasks
                        </p>
                      </div>
                      <Switch
                        checked={userSettings.notifications.comments}
                        onCheckedChange={(checked) =>
                          setUserSettings({
                            ...userSettings,
                            notifications: {
                              ...userSettings.notifications,
                              comments: checked,
                            },
                          })
                        }
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Project Updates</Label>
                        <p className="text-sm text-muted-foreground">
                          Important updates to projects you're part of
                        </p>
                      </div>
                      <Switch
                        checked={userSettings.notifications.projectUpdates}
                        onCheckedChange={(checked) =>
                          setUserSettings({
                            ...userSettings,
                            notifications: {
                              ...userSettings.notifications,
                              projectUpdates: checked,
                            },
                          })
                        }
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Milestone Reminders</Label>
                        <p className="text-sm text-muted-foreground">
                          Reminders for upcoming milestones
                        </p>
                      </div>
                      <Switch
                        checked={userSettings.notifications.milestoneReminders}
                        onCheckedChange={(checked) =>
                          setUserSettings({
                            ...userSettings,
                            notifications: {
                              ...userSettings.notifications,
                              milestoneReminders: checked,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Email Digest Frequency</Label>
                  <Select
                    value={userSettings.notifications.emailDigest}
                    onValueChange={(value: 'daily' | 'weekly' | 'none') =>
                      setUserSettings({
                        ...userSettings,
                        notifications: {
                          ...userSettings.notifications,
                          emailDigest: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Receive a summary of activity in your workspace
                  </p>
                </div>
                <Button onClick={handleSaveNotifications}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Appearance Settings</CardTitle>
                <CardDescription>
                  Customize how OpenPlan looks for you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {(['light', 'dark', 'system'] as const).map((theme) => (
                      <button
                        key={theme}
                        onClick={() =>
                          setUserSettings({ ...userSettings, theme })
                        }
                        className={`p-4 rounded-lg border-2 transition-colors ${userSettings.theme === theme
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                          }`}
                      >
                        <div
                          className={`h-12 rounded mb-2 ${theme === 'light'
                              ? 'bg-white border'
                              : theme === 'dark'
                                ? 'bg-zinc-900'
                                : 'bg-gradient-to-r from-white to-zinc-900'
                            }`}
                        />
                        <span className="text-sm font-medium capitalize">
                          {theme}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Sidebar Collapsed by Default</Label>
                      <p className="text-sm text-muted-foreground">
                        Start with a collapsed sidebar for more workspace
                      </p>
                    </div>
                    <Switch
                      checked={userSettings.sidebarCollapsed}
                      onCheckedChange={(checked) =>
                        setUserSettings({
                          ...userSettings,
                          sidebarCollapsed: checked,
                        })
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Compact Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Reduce spacing to show more content
                      </p>
                    </div>
                    <Switch
                      checked={userSettings.compactMode}
                      onCheckedChange={(checked) =>
                        setUserSettings({
                          ...userSettings,
                          compactMode: checked,
                        })
                      }
                    />
                  </div>
                </div>
                <Button onClick={handleSaveAppearance}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Appearance
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Danger Tab */}
          <TabsContent value="danger">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input id="current-password" type="password" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input id="new-password" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input id="confirm-password" type="password" />
                    </div>
                  </div>
                  <Button variant="outline">
                    <Lock className="h-4 w-4 mr-2" />
                    Update Password
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader>
                  <CardTitle className="text-destructive">Delete Account</CardTitle>
                  <CardDescription>
                    Permanently delete your account and all of your content.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    This action is irreversible. Please continue with caution.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Settings;
