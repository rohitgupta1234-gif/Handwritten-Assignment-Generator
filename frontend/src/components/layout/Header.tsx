import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bell,
  Search,
  Sun,
  Moon,
  ChevronDown,
  LayoutDashboard,
  FileText,
  PenTool,
  Settings,
  LogOut,
  User,
  BookOpen,
  Menu,
  X,
  Download as DownloadIcon,
} from 'lucide-react';
import { classNames } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import { useHandwriting } from '../../context/HandwritingContext';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { Tooltip } from '../ui/Tooltip';
import { NetworkStatusIndicator } from '../ui/NetworkStatusIndicator';
import type { DropdownOption } from '../ui/Dropdown';

export function Header() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { user, logout } = useAuth();
  const { activeProfile } = useHandwriting();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleClickOutside = (ref: React.RefObject<HTMLDivElement>, setter: (open: boolean) => void) => {
    return (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setter(false);
      }
    };
  };

  useEffect(() => {
    const handleNotificationsClick = handleClickOutside(notificationsRef, setNotificationsOpen);
    const handleProfileClick = handleClickOutside(profileRef, setProfileOpen);
    document.addEventListener('mousedown', handleNotificationsClick);
    document.addEventListener('mousedown', handleProfileClick);
    return () => {
      document.removeEventListener('mousedown', handleNotificationsClick);
      document.removeEventListener('mousedown', handleProfileClick);
    };
  }, []);

  const handleProfileSelect = (value: string) => {
    setProfileOpen(false);
    switch (value) {
      case 'profile':
      case 'settings':
        window.location.href = '/settings';
        break;
      case 'handwriting':
        window.location.href = '/handwriting-profile';
        break;
      case 'logout':
        logout();
        break;
    }
  };

  const notifications = [
    { id: '1', title: 'Assignment Generated', message: 'Your math assignment is ready', time: '2 min ago', unread: true },
    { id: '2', title: 'Profile Updated', message: 'Handwriting profile analyzed successfully', time: '1 hour ago', unread: true },
    { id: '3', title: 'Export Complete', message: 'PDF downloaded successfully', time: '3 hours ago', unread: false },
  ];

  const quickActions: DropdownOption[] = [
    { value: '/create-assignment', label: 'New Assignment', icon: <FileText className="w-4 h-4" />, description: 'Create a new assignment' },
    { value: '/create-assignment?tab=upload', label: 'Upload Questions', icon: <FileText className="w-4 h-4" />, description: 'Upload question paper' },
    { value: '/handwriting-profile', label: 'Handwriting Profile', icon: <PenTool className="w-4 h-4" />, description: 'Manage your handwriting' },
    { value: '/assignment-preview', label: 'Download PDF', icon: <DownloadIcon className="w-4 h-4" />, description: 'Preview and download' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-notebook-blue-100">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left side - Mobile menu & Search */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>

          <div className="hidden md:block relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-notebook-blue-400" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search assignments, profiles..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-notebook-paper-100 border border-notebook-blue-200 rounded-xl text-sm focus:outline-none focus:border-notebook-blue-500 focus:ring-2 focus:ring-notebook-blue-500/20"
              aria-label="Search"
            />
          </div>
        </div>

        {/* Center - Page Title */}
        <div className="hidden lg:flex items-center gap-4">
          <h1 className="font-heading text-xl text-notebook-blue-800">
            {location.pathname === '/dashboard' && 'Dashboard'}
            {location.pathname === '/create-assignment' && 'Create Assignment'}
            {location.pathname === '/handwriting-profile' && 'Handwriting Profile'}
            {location.pathname === '/my-assignments' && 'My Assignments'}
            {location.pathname === '/assignment-preview' && 'Assignment Preview'}
            {location.pathname === '/settings' && 'Settings'}
            {location.pathname === '/login' && 'Sign In'}
            {location.pathname === '/register' && 'Create Account'}
          </h1>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          {/* Network Status Indicator */}
          <NetworkStatusIndicator />

          {/* Theme Toggle */}
          <Tooltip content={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} position="bottom">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Enable dark mode' : 'Enable light mode'}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>
          </Tooltip>

          {/* Notifications */}
          <div ref={notificationsRef} className="relative">
            <Tooltip content="Notifications" position="bottom">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
              >
                <Bell className="w-5 h-5 relative" />
                {notifications.some(n => n.unread) && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.filter(n => n.unread).length}
                  </span>
                )}
              </Button>
            </Tooltip>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-notebook-blue-200 shadow-lg animate-fade-in">
                <div className="p-4 border-b border-notebook-blue-100 flex items-center justify-between">
                  <h3 className="font-semibold text-notebook-ink-50">Notifications</h3>
                  <Button variant="ghost" size="sm" className="text-xs">Mark all read</Button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={classNames(
                        'p-4 hover:bg-notebook-blue-50 border-b border-notebook-blue-100 transition-colors',
                        notification.unread && 'bg-notebook-blue-50/50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-notebook-blue-100 flex items-center justify-center flex-shrink-0">
                          <Bell className="w-4 h-4 text-notebook-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={classNames('text-sm font-medium', notification.unread ? 'text-notebook-ink-50' : 'text-notebook-blue-600')}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-notebook-blue-500 mt-0.5">{notification.message}</p>
                          <p className="text-xs text-notebook-blue-400 mt-1">{notification.time}</p>
                        </div>
                        {notification.unread && (
                          <span className="w-2 h-2 rounded-full bg-notebook-blue-500 flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-notebook-blue-100">
                  <Button variant="ghost" fullWidth size="sm">View all notifications</Button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions Dropdown */}
          <Tooltip content="Quick Actions" position="bottom">
            <Dropdown
              options={quickActions}
              placeholder="Quick Actions"
              onChange={value => window.location.href = value}
            />
          </Tooltip>

          {/* Profile Menu */}
          <div ref={profileRef} className="relative">
            <Tooltip content="Account Menu" position="bottom">
              <Button
                variant="ghost"
                size="sm"
                className="p-1 gap-2"
                onClick={() => setProfileOpen(!profileOpen)}
                aria-label="Account menu"
                aria-expanded={profileOpen}
              >
                <Avatar
                  name={user?.name}
                  src={user?.avatar}
                  size="sm"
                  status="online"
                />
                {!mobileMenuOpen && user && (
                  <span className="hidden sm:block text-sm font-medium text-notebook-ink-50">
                    {user.name}
                  </span>
                )}
                <ChevronDown className="w-4 h-4 hidden sm:block" />
              </Button>
            </Tooltip>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-notebook-blue-200 shadow-lg animate-fade-in">
                <div className="p-4 border-b border-notebook-blue-100">
                  <div className="flex items-center gap-3">
                    <Avatar name={user?.name} src={user?.avatar} size="lg" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-notebook-ink-50 truncate">{user?.name}</p>
                      <p className="text-sm text-notebook-blue-500 truncate">{user?.email}</p>
                    </div>
                  </div>
                  {activeProfile && (
                    <div className="mt-3 p-3 bg-notebook-purple-50 rounded-xl">
                      <div className="flex items-center gap-2 text-sm">
                        <PenTool className="w-4 h-4 text-notebook-purple-600" />
                        <span className="text-notebook-purple-700 font-medium">
                          {activeProfile.name}
                        </span>
                        <span className="ml-auto text-xs text-notebook-purple-500">Active</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="py-2">
                  <button
                    onClick={() => handleProfileSelect('profile')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-notebook-ink-50 hover:bg-notebook-blue-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-notebook-blue-500" />
                    Profile
                  </button>
                  <button
                    onClick={() => handleProfileSelect('handwriting')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-notebook-ink-50 hover:bg-notebook-blue-50 transition-colors"
                  >
                    <PenTool className="w-4 h-4 text-notebook-blue-500" />
                    Handwriting Profile
                  </button>
                  <button
                    onClick={() => handleProfileSelect('settings')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-notebook-ink-50 hover:bg-notebook-blue-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-notebook-blue-500" />
                    Settings
                  </button>
                  <div className="border-t border-notebook-blue-100 my-2" />
                  <button
                    onClick={() => handleProfileSelect('logout')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-notebook-blue-100 animate-slide-up">
          <nav className="py-4 px-4 space-y-2">
            <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-notebook-blue-700 hover:bg-notebook-blue-50">
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </Link>
            <Link to="/create-assignment" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-notebook-blue-700 hover:bg-notebook-blue-50">
              <FileText className="w-5 h-5" />
              Create Assignment
            </Link>
            <Link to="/handwriting-profile" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-notebook-blue-700 hover:bg-notebook-blue-50">
              <PenTool className="w-5 h-5" />
              Handwriting Profile
            </Link>
            <Link to="/my-assignments" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-notebook-blue-700 hover:bg-notebook-blue-50">
              <BookOpen className="w-5 h-5" />
              My Assignments
            </Link>
            <Link to="/assignment-preview" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-notebook-blue-700 hover:bg-notebook-blue-50">
              <DownloadIcon className="w-5 h-5" />
              Assignment Preview
            </Link>
            <Link to="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-notebook-blue-700 hover:bg-notebook-blue-50">
              <Settings className="w-5 h-5" />
              Settings
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}