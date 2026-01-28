import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { defaultUserSettings } from '@/data/mockData';
import { UserSettings } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Palette,
  Save,
  Upload,
  ShieldAlert,
  Trash2,
  Lock,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { profileService } from '@/services/profile.service';
import { organizationsService, OrganizationSettings } from '@/services/organizations.service';

const Settings = () => {
  const navigate = useNavigate();
  const { profile, refreshProfile, updatePassword, deleteAccount } = useAuth();
  const { currentOrganization, refreshOrganizations } = useOrganization();

  // User settings for notifications/appearance (still local - coming soon)
  const [userSettings, setUserSettings] = useState<UserSettings>(defaultUserSettings);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: '',
    initials: '',
    role: '',
    bio: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  // Organization form state
  const [orgForm, setOrgForm] = useState({
    name: '',
    description: '',
    companyName: '',
    companySize: '',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    logoUrl: '',
  });
  const [orgLoading, setOrgLoading] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Sync profile data to form
  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name || '',
        initials: profile.initials || '',
        role: profile.role || '',
        bio: profile.bio || '',
      });
    }
  }, [profile]);

  // Sync organization data to form
  useEffect(() => {
    if (currentOrganization) {
      const settings = (currentOrganization.settings || {}) as OrganizationSettings;
      setOrgForm({
        name: currentOrganization.name || '',
        description: currentOrganization.description || '',
        companyName: settings.companyName || '',
        companySize: settings.companySize || '',
        timezone: settings.timezone || 'America/New_York',
        dateFormat: settings.dateFormat || 'MM/DD/YYYY',
        logoUrl: settings.logoUrl || '',
      });
    }
  }, [currentOrganization]);

  const handleSaveGeneral = async () => {
    if (!currentOrganization) {
      toast.error('No organization selected');
      return;
    }

    setOrgLoading(true);
    try {
      // Update organization name and description
      await organizationsService.update(currentOrganization.id, {
        name: orgForm.name,
        description: orgForm.description,
      });

      // Update organization settings
      await organizationsService.updateSettings(currentOrganization.id, {
        companyName: orgForm.companyName,
        companySize: orgForm.companySize,
        timezone: orgForm.timezone,
        dateFormat: orgForm.dateFormat,
      });

      await refreshOrganizations();
      toast.success('Workspace settings saved');
    } catch (error) {
      console.error('Error saving workspace settings:', error);
      toast.error('Failed to save workspace settings');
    } finally {
      setOrgLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setProfileLoading(true);
    try {
      await profileService.updateProfile({
        name: profileForm.name,
        initials: profileForm.initials,
        role: profileForm.role,
        bio: profileForm.bio,
      });
      await refreshProfile();
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoClick = () => {
    logoInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size must be less than 2MB');
        return;
      }

      setAvatarLoading(true);
      try {
        await profileService.uploadAvatar(file);
        await refreshProfile();
        toast.success('Avatar updated successfully');
      } catch (error) {
        console.error('Error uploading avatar:', error);
        toast.error('Failed to upload avatar');
      } finally {
        setAvatarLoading(false);
      }
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentOrganization) return;

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size must be less than 2MB');
        return;
      }

      setLogoLoading(true);
      try {
        const logoUrl = await organizationsService.uploadLogo(currentOrganization.id, file);
        setOrgForm(prev => ({ ...prev, logoUrl }));
        await refreshOrganizations();
        toast.success('Organization logo updated successfully');
      } catch (error) {
        console.error('Error uploading logo:', error);
        toast.error('Failed to upload logo');
      } finally {
        setLogoLoading(false);
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!currentOrganization) return;

    setLogoLoading(true);
    try {
      await organizationsService.deleteLogo(currentOrganization.id);
      setOrgForm(prev => ({ ...prev, logoUrl: '' }));
      await refreshOrganizations();
      toast.success('Organization logo removed');
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error('Failed to remove logo');
    } finally {
      setLogoLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await updatePassword(passwordForm.newPassword);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Password updated successfully');
        setPasswordForm({ newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const { error } = await deleteAccount();
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Account deleted');
        navigate('/login');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    } finally {
      setDeleteLoading(false);
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="notifications" className="gap-2">
                    <Bell className="h-4 w-4 hidden sm:block" />
                    <span className="hidden sm:inline">Notifications</span>
                    <span className="sm:hidden">Notifs</span>
                    <Badge variant="outline" className="ml-1 bg-amber-100 text-amber-800 border-amber-300 text-xs">
                      Soon
                    </Badge>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>This feature is coming soon</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="appearance" className="gap-2">
                    <Palette className="h-4 w-4 hidden sm:block" />
                    <span className="hidden sm:inline">Appearance</span>
                    <span className="sm:hidden">Theme</span>
                    <Badge variant="outline" className="ml-1 bg-amber-100 text-amber-800 border-amber-300 text-xs">
                      Soon
                    </Badge>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>This feature is coming soon</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
                {/* Organization Logo */}
                <div className="space-y-2">
                  <Label>Organization Logo</Label>
                  <div className="flex items-center gap-6">
                    <div className="h-20 w-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden">
                      {logoLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      ) : orgForm.logoUrl ? (
                        <img
                          src={orgForm.logoUrl}
                          alt="Organization logo"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="text-center">
                          <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">No logo</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <input
                        type="file"
                        ref={logoInputRef}
                        className="hidden"
                        accept="image/png, image/jpeg, image/gif, image/svg+xml"
                        onChange={handleLogoChange}
                      />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleLogoClick} disabled={logoLoading}>
                          <Upload className="h-4 w-4 mr-2" />
                          {orgForm.logoUrl ? 'Change Logo' : 'Upload Logo'}
                        </Button>
                        {orgForm.logoUrl && (
                          <Button variant="outline" size="sm" onClick={handleRemoveLogo} disabled={logoLoading}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG, GIF or SVG. Max 2MB. Recommended size: 200x200px.
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="workspace-name">Workspace Name</Label>
                  <Input
                    id="workspace-name"
                    value={orgForm.name}
                    onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workspace-desc">Description</Label>
                  <Textarea
                    id="workspace-desc"
                    value={orgForm.description}
                    onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input
                      id="company-name"
                      value={orgForm.companyName}
                      onChange={(e) => setOrgForm({ ...orgForm, companyName: e.target.value })}
                      placeholder="e.g. Acme Corp"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-size">Company Size</Label>
                    <Select
                      value={orgForm.companySize}
                      onValueChange={(value) => setOrgForm({ ...orgForm, companySize: value })}
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
                      value={orgForm.timezone}
                      onValueChange={(value) => setOrgForm({ ...orgForm, timezone: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                        <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                        <SelectItem value="Europe/London">Greenwich Mean Time (GMT)</SelectItem>
                        <SelectItem value="Europe/Paris">Central European Time (CET)</SelectItem>
                        <SelectItem value="Asia/Kolkata">India Standard Time (IST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date Format</Label>
                    <Select
                      value={orgForm.dateFormat}
                      onValueChange={(value) => setOrgForm({ ...orgForm, dateFormat: value })}
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
                <Button onClick={handleSaveGeneral} disabled={orgLoading}>
                  {orgLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
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
                      {avatarLoading ? (
                        <AvatarFallback className="bg-primary/10">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </AvatarFallback>
                      ) : profile?.avatar_url ? (
                        <AvatarImage src={profile.avatar_url} alt={profile.name} />
                      ) : (
                        <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                          {profileForm.initials || 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="space-y-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/png, image/jpeg, image/gif"
                        onChange={handleAvatarChange}
                      />
                      <Button variant="outline" size="sm" onClick={handleAvatarClick} disabled={avatarLoading}>
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
                        value={profileForm.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          const initials = name
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2);
                          setProfileForm({ ...profileForm, name, initials });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={profile?.email || ''}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role / Title</Label>
                    <Input
                      id="role"
                      value={profileForm.role}
                      onChange={(e) => setProfileForm({ ...profileForm, role: e.target.value })}
                      placeholder="e.g. Project Manager"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                      rows={3}
                      placeholder="Tell us a bit about yourself..."
                    />
                  </div>
                  <Button onClick={handleSaveProfile} disabled={profileLoading}>
                    {profileLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Profile
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications Tab - Coming Soon */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Notification Preferences</CardTitle>
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                    Coming Soon
                  </Badge>
                </div>
                <CardDescription>
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 opacity-50 pointer-events-none">
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
                      <Switch checked={userSettings.notifications.taskAssignments} disabled />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Task Completions</Label>
                        <p className="text-sm text-muted-foreground">
                          When tasks you're following are completed
                        </p>
                      </div>
                      <Switch checked={userSettings.notifications.taskCompletions} disabled />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Comments & Mentions</Label>
                        <p className="text-sm text-muted-foreground">
                          When someone mentions you or comments on your tasks
                        </p>
                      </div>
                      <Switch checked={userSettings.notifications.comments} disabled />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Project Updates</Label>
                        <p className="text-sm text-muted-foreground">
                          Important updates to projects you're part of
                        </p>
                      </div>
                      <Switch checked={userSettings.notifications.projectUpdates} disabled />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Milestone Reminders</Label>
                        <p className="text-sm text-muted-foreground">
                          Reminders for upcoming milestones
                        </p>
                      </div>
                      <Switch checked={userSettings.notifications.milestoneReminders} disabled />
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Email Digest Frequency</Label>
                  <Select value={userSettings.notifications.emailDigest} disabled>
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
                <Button disabled>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab - Coming Soon */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Appearance Settings</CardTitle>
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                    Coming Soon
                  </Badge>
                </div>
                <CardDescription>
                  Customize how OpenPlan looks for you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 opacity-50 pointer-events-none">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {(['light', 'dark', 'system'] as const).map((theme) => (
                      <button
                        key={theme}
                        disabled
                        className={`p-4 rounded-lg border-2 transition-colors ${
                          userSettings.theme === theme
                            ? 'border-primary bg-primary/5'
                            : 'border-border'
                        }`}
                      >
                        <div
                          className={`h-12 rounded mb-2 ${
                            theme === 'light'
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
                    <Switch checked={userSettings.sidebarCollapsed} disabled />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Compact Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Reduce spacing to show more content
                      </p>
                    </div>
                    <Switch checked={userSettings.compactMode} disabled />
                  </div>
                </div>
                <Button disabled>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        placeholder="Enter new password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleUpdatePassword}
                    disabled={passwordLoading || !passwordForm.newPassword || !passwordForm.confirmPassword}
                  >
                    {passwordLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4 mr-2" />
                    )}
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
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={deleteLoading}>
                        {deleteLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your
                          account and remove your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
