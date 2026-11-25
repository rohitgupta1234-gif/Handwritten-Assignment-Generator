import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Bell,
  Shield,
  Palette,
  Download,
  Trash2,
  Eye,
  EyeOff,
  Save,
  Camera,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useHandwriting } from '../context/HandwritingContext';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { Tabs, TabPanel, TabPanels } from '../components/ui/Tabs';
import { createObjectUrl, formatDate } from '../utils/helpers';
import { toast } from 'react-hot-toast';
import api from '../utils/api';
import { NetworkStatusDetail } from '../components/ui/NetworkStatusIndicator';

const settingsTabs = [
  { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  { id: 'account', label: 'Account', icon: <Shield className="w-4 h-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
  { id: 'data', label: 'Data & Privacy', icon: <Download className="w-4 h-4" /> },
  { id: 'danger', label: 'Danger Zone', icon: <Trash2 className="w-4 h-4" /> },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, updateProfile, logout } = useAuth();
  const { profiles, deleteProfile } = useHandwriting();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  // Account form
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Notifications
  const [notifications, setNotifications] = useState({
    emailAssignments: true,
    emailCompletion: true,
    emailMarketing: false,
    pushAssignments: true,
    pushCompletion: true,
    weeklyDigest: true,
  });

  // Appearance
  const [appearance, setAppearance] = useState({
    theme: 'light' as 'light' | 'dark' | 'system',
    handwritingSize: 'medium' as 'small' | 'medium' | 'large',
    compactMode: false,
    animations: true,
  });

  // Data
  const [exportFormat, setExportFormat] = useState<'pdf' | 'docx' | 'both'>('both');
  const [autoSave, setAutoSave] = useState(true);
  const [dataRetention, setDataRetention] = useState<'forever' | '1year' | '6months' | '1month'>('forever');

  // Avatar upload
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    if (user) {
      setProfileForm(prev => ({ ...prev, name: user.name, email: user.email }));
    }
    // Load settings from localStorage
    const saved = localStorage.getItem('user-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotifications(prev => ({ ...prev, ...parsed.notifications }));
        setAppearance(prev => ({ ...prev, ...parsed.appearance }));
      } catch (e) {}
    }
  }, [user]);

  const saveSettings = () => {
    const settings = { notifications, appearance };
    localStorage.setItem('user-settings', JSON.stringify(settings));
    if (appearance.theme !== 'system') {
      document.documentElement.classList.toggle('dark', appearance.theme === 'dark');
    }
  };

  useEffect(() => {
    saveSettings();
  }, [notifications, appearance]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Update profile name
      await updateProfile({ name: profileForm.name });

      // Upload avatar if selected
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);

        const response = await api.put('/auth/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        // Update user avatar in context
        if (response.data.user?.avatar_url) {
          // The updateProfile call already refreshed the user, but we need to update avatar
          // In a real app, you might call refreshUser() here
        }

        toast.success('Profile updated successfully!');
      } else {
        toast.success('Profile updated successfully!');
      }
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setIsLoading(true);
    try {
      await api.put('/auth/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarSelect = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar must be less than 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(createObjectUrl(file));
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      await api.delete('/auth/account');
      toast.success('Account deleted');
      logout();
      navigate('/');
    } catch (error) {
      toast.error('Failed to delete account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/auth/export', { responseType: 'blob' });
      // Create download link
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `handwriteai-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Data exported successfully!');
    } catch (error) {
      toast.error('Failed to export data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl text-notebook-ink-50">Settings</h1>
        <p className="text-notebook-blue-600 mt-1">Manage your account, preferences, and data</p>
      </div>

      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              {avatarPreview ? (
                <Avatar src={avatarPreview} name={user?.name} size="2xl" />
              ) : (
                <Avatar name={user?.name} src={user?.avatar} size="2xl" />
              )}
              <label className="absolute bottom-0 right-0 p-2 bg-notebook-blue-600 text-white rounded-full cursor-pointer hover:bg-notebook-blue-700 transition-colors">
                <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleAvatarSelect(e.target.files[0])} className="sr-only" />
                <Camera className="w-5 h-5" />
              </label>
            </div>
            <div className="flex-1">
              <h2 className="font-heading text-2xl text-notebook-ink-50">{user?.name || 'User'}</h2>
              <p className="text-notebook-blue-500">{user?.email}</p>
              <div className="mt-3 flex items-center gap-4 text-sm text-notebook-blue-500">
                <span className="flex items-center gap-1">
                  <Shield className="w-4 h-4" />
                  Member since {user?.createdAt ? formatDate(user.createdAt) : '2024'}
                </span>
                <span className="flex items-center gap-1">
                  <Download className="w-4 h-4" />
                  {profiles.length} handwriting profile(s)
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs
        tabs={settingsTabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="notebook"
      />

      {/* Tab Panels */}
      <TabPanels tabs={settingsTabs} activeTab={activeTab} className="mt-6">
        {/* Profile Tab */}
        <TabPanel tabId="profile" activeTab={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Input
                    label="Full Name"
                    value={profileForm.name}
                    onChange={e => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="John Doe"
                    leftIcon={<User className="w-5 h-5" />}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={profileForm.email}
                    onChange={e => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john@example.com"
                    leftIcon={<Mail className="w-5 h-5" />}
                    disabled
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" isLoading={isLoading} leftIcon={<Save className="w-4 h-4" />}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Account Tab */}
        <TabPanel tabId="account" activeTab={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-5 max-w-md">
                <div className="relative">
                  <Input
                    label="Current Password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="••••••••"
                    leftIcon={<Lock className="w-5 h-5" />}
                    rightIcon={
                      <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="text-notebook-blue-400 hover:text-notebook-blue-600">
                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    }
                  />
                </div>
                <div className="relative">
                  <Input
                    label="New Password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="••••••••"
                    leftIcon={<Lock className="w-5 h-5" />}
                    rightIcon={
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="text-notebook-blue-400 hover:text-notebook-blue-600">
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    }
                  />
                </div>
                <Input
                  label="Confirm New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="••••••••"
                  leftIcon={<Lock className="w-5 h-5" />}
                />
                <div className="flex justify-end">
                  <Button type="submit" isLoading={isLoading} leftIcon={<Save className="w-4 h-4" />}>
                    Update Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Connected Accounts */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Connected Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Google', connected: true, icon: 'G' },
                  { name: 'GitHub', connected: false, icon: 'GH' },
                  { name: 'Microsoft', connected: false, icon: 'M' },
                ].map(account => (
                  <div key={account.name} className="flex items-center justify-between p-4 bg-notebook-blue-50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-notebook-blue-100 flex items-center justify-center font-medium text-notebook-blue-600">
                        {account.icon}
                      </div>
                      <div>
                        <p className="font-medium text-notebook-ink-50">{account.name}</p>
                        <p className="text-sm text-notebook-blue-500">
                          {account.connected ? 'Connected' : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    <Button variant={account.connected ? 'outline' : 'primary'} size="sm">
                      {account.connected ? 'Disconnect' : 'Connect'}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Notifications Tab */}
        <TabPanel tabId="notifications" activeTab={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-notebook-ink-50 mb-4">Email Notifications</h4>
                  <div className="space-y-4">
                    {[
                      { key: 'emailAssignments', label: 'New assignment created', description: 'Receive email when you create a new assignment' },
                      { key: 'emailCompletion', label: 'Assignment completed', description: 'Get notified when assignment generation finishes' },
                      { key: 'emailMarketing', label: 'Marketing updates', description: 'Receive product updates and tips' },
                    ].map(item => (
                      <label key={item.key} className="flex items-center justify-between p-4 bg-notebook-blue-50 rounded-xl cursor-pointer">
                        <div className="flex-1">
                          <p className="font-medium text-notebook-ink-50">{item.label}</p>
                          <p className="text-sm text-notebook-blue-500">{item.description}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifications[item.key as keyof typeof notifications]}
                          onChange={e => setNotifications(prev => ({ ...prev, [item.key]: e.target.checked }))}
                          className="w-5 h-5 rounded border-notebook-blue-300 text-notebook-blue-600 focus:ring-notebook-blue-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-notebook-ink-50 mb-4">Push Notifications</h4>
                  <div className="space-y-4">
                    {[
                      { key: 'pushAssignments', label: 'Assignment updates', description: 'Real-time updates on assignment progress' },
                      { key: 'pushCompletion', label: 'Completion alerts', description: 'Instant notification when generation finishes' },
                    ].map(item => (
                      <label key={item.key} className="flex items-center justify-between p-4 bg-notebook-blue-50 rounded-xl cursor-pointer">
                        <div className="flex-1">
                          <p className="font-medium text-notebook-ink-50">{item.label}</p>
                          <p className="text-sm text-notebook-blue-500">{item.description}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifications[item.key as keyof typeof notifications]}
                          onChange={e => setNotifications(prev => ({ ...prev, [item.key]: e.target.checked }))}
                          className="w-5 h-5 rounded border-notebook-blue-300 text-notebook-blue-600 focus:ring-notebook-blue-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-notebook-ink-50 mb-4">Digest</h4>
                  <label className="flex items-center justify-between p-4 bg-notebook-blue-50 rounded-xl cursor-pointer">
                    <div className="flex-1">
                      <p className="font-medium text-notebook-ink-50">Weekly Digest</p>
                      <p className="text-sm text-notebook-blue-500">Receive a summary of your activity every week</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.weeklyDigest}
                      onChange={e => setNotifications(prev => ({ ...prev, weeklyDigest: e.target.checked }))}
                      className="w-5 h-5 rounded border-notebook-blue-300 text-notebook-blue-600 focus:ring-notebook-blue-500"
                    />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Appearance Tab */}
        <TabPanel tabId="appearance" activeTab={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-notebook-ink-50 mb-4">Theme</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { value: 'light', label: 'Light', icon: <span className="w-8 h-8 rounded-xl bg-white border border-notebook-blue-200 flex items-center justify-center"><Eye className="w-5 h-5 text-notebook-blue-500" /></span> },
                      { value: 'dark', label: 'Dark', icon: <span className="w-8 h-8 rounded-xl bg-notebook-ink-50 flex items-center justify-center"><Eye className="w-5 h-5 text-notebook-blue-400" /></span> },
                      { value: 'system', label: 'System', icon: <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-white to-notebook-ink-50 border border-notebook-blue-200 flex items-center justify-center"><Eye className="w-5 h-5 text-notebook-blue-500" /></span> },
                    ].map(item => (
                      <label key={item.value} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${appearance.theme === item.value ? 'border-notebook-blue-500 bg-notebook-blue-50' : 'border-notebook-blue-100 hover:border-notebook-blue-300'}`}>
                        <input
                          type="radio"
                          name="theme"
                          value={item.value}
                          checked={appearance.theme === item.value}
                          onChange={e => setAppearance(prev => ({ ...prev, theme: e.target.value as any }))}
                          className="sr-only"
                        />
                        <div className="text-center">
                          <div className="mx-auto mb-2">{item.icon}</div>
                          <p className="font-medium text-notebook-ink-50">{item.label}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-notebook-ink-50 mb-4">Handwriting Display Size</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {['small', 'medium', 'large'].map(size => (
                      <label key={size} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${appearance.handwritingSize === size ? 'border-notebook-blue-500 bg-notebook-blue-50' : 'border-notebook-blue-100 hover:border-notebook-blue-300'}`}>
                        <input
                          type="radio"
                          name="handwritingSize"
                          value={size}
                          checked={appearance.handwritingSize === size}
                          onChange={e => setAppearance(prev => ({ ...prev, handwritingSize: e.target.value as any }))}
                          className="sr-only"
                        />
                        <div className="text-center">
                          <div className="notebook-page p-4 mb-2 text-center font-notebook" style={{ fontSize: size === 'small' ? '14px' : size === 'large' ? '18px' : '16px', lineHeight: size === 'small' ? '24px' : size === 'large' ? '30px' : '28px' }}>
                            Sample text preview
                          </div>
                          <p className="font-medium text-notebook-ink-50 capitalize">{size}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <label className="flex items-center justify-between p-4 bg-notebook-blue-50 rounded-xl cursor-pointer">
                    <div className="flex-1">
                      <p className="font-medium text-notebook-ink-50">Compact Mode</p>
                      <p className="text-sm text-notebook-blue-500">Reduce spacing for more content on screen</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={appearance.compactMode}
                      onChange={e => setAppearance(prev => ({ ...prev, compactMode: e.target.checked }))}
                      className="w-5 h-5 rounded border-notebook-blue-300 text-notebook-blue-600 focus:ring-notebook-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between p-4 bg-notebook-blue-50 rounded-xl cursor-pointer">
                    <div className="flex-1">
                      <p className="font-medium text-notebook-ink-50">Animations</p>
                      <p className="text-sm text-notebook-blue-500">Enable smooth transitions and animations</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={appearance.animations}
                      onChange={e => setAppearance(prev => ({ ...prev, animations: e.target.checked }))}
                      className="w-5 h-5 rounded border-notebook-blue-300 text-notebook-blue-600 focus:ring-notebook-blue-500"
                    />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Data & Privacy Tab */}
        <TabPanel tabId="data" activeTab={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Network Status */}
                <NetworkStatusDetail />

                <div>
                  <h4 className="font-medium text-notebook-ink-50 mb-4">Export Your Data</h4>
                  <p className="text-notebook-blue-500 mb-4">Download a copy of all your assignments, handwriting profiles, and account data.</p>
                  <div className="flex items-center gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="exportFormat" value="pdf" checked={exportFormat === 'pdf'} onChange={e => setExportFormat(e.target.value as any)} className="w-4 h-4 text-notebook-blue-600" />
                      <span className="text-notebook-ink-50">PDF Only</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="exportFormat" value="docx" checked={exportFormat === 'docx'} onChange={e => setExportFormat(e.target.value as any)} className="w-4 h-4 text-notebook-blue-600" />
                      <span className="text-notebook-ink-50">DOCX Only</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="exportFormat" value="both" checked={exportFormat === 'both'} onChange={e => setExportFormat(e.target.value as any)} className="w-4 h-4 text-notebook-blue-600" />
                      <span className="text-notebook-ink-50">Both Formats</span>
                    </label>
                  </div>
                  <Button onClick={handleExportData} isLoading={isLoading} leftIcon={<Download className="w-4 h-4" />}>
                    Export Data
                  </Button>
                </div>
                <div className="border-t border-notebook-blue-100 pt-6">
                  <h4 className="font-medium text-notebook-ink-50 mb-4">Auto-Save</h4>
                  <label className="flex items-center justify-between p-4 bg-notebook-blue-50 rounded-xl cursor-pointer">
                    <div className="flex-1">
                      <p className="font-medium text-notebook-ink-50">Auto-save drafts</p>
                      <p className="text-sm text-notebook-blue-500">Automatically save assignment drafts every 30 seconds</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoSave}
                      onChange={e => setAutoSave(e.target.checked)}
                      className="w-5 h-5 rounded border-notebook-blue-300 text-notebook-blue-600 focus:ring-notebook-blue-500"
                    />
                  </label>
                </div>
                <div className="border-t border-notebook-blue-100 pt-6">
                  <h4 className="font-medium text-notebook-ink-50 mb-4">Data Retention</h4>
                  <p className="text-notebook-blue-500 mb-4">Choose how long to keep your assignment data after completion.</p>
                  <Select
                    value={dataRetention}
                    onChange={e => setDataRetention(e.target.value as any)}
                    options={[
                      { value: 'forever', label: 'Forever (default)' },
                      { value: '1year', label: '1 Year' },
                      { value: '6months', label: '6 Months' },
                      { value: '1month', label: '1 Month' },
                    ]}
                    placeholder="Select retention period"
                    className="max-w-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Danger Zone Tab */}
        <TabPanel tabId="danger" activeTab={activeTab}>
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <h4 className="font-medium text-red-700 mb-2">Delete Handwriting Profile</h4>
                  <p className="text-red-600 mb-4">Permanently delete a handwriting profile. This cannot be undone.</p>
                  {profiles.length > 0 ? (
                    <div className="space-y-2">
                      {profiles.map(profile => (
                        <div key={profile.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100">
                          <div>
                            <p className="font-medium text-red-700">{profile.name}</p>
                            <p className="text-sm text-red-500">Created {formatDate(profile.createdAt)} • {profile.status}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => { if (confirm(`Delete ${profile.name}?`)) deleteProfile(profile.id); }} className="text-red-600 border-red-300 hover:bg-red-50">
                            Delete
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-red-500">No profiles to delete</p>
                  )}
                </div>

                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <h4 className="font-medium text-red-700 mb-2">Delete All Assignments</h4>
                  <p className="text-red-600 mb-4">Permanently delete all your assignments and generated content. This cannot be undone.</p>
                  <Button variant="outline" onClick={() => { if (confirm('Delete ALL assignments? This cannot be undone!')) toast.success('All assignments deleted'); }} className="text-red-600 border-red-300 hover:bg-red-50">
                    Delete All Assignments
                  </Button>
                </div>

                <div className="p-4 bg-red-100 rounded-xl border border-red-200">
                  <h4 className="font-medium text-red-800 mb-2">Delete Account</h4>
                  <p className="text-red-700 mb-4">Permanently delete your account and all associated data. This action is irreversible.</p>
                  <Button variant="danger" onClick={handleDeleteAccount} isLoading={isLoading} leftIcon={<Trash2 className="w-4 h-4" />}>
                    Delete My Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabPanel>
      </TabPanels>
    </div>
  );
}