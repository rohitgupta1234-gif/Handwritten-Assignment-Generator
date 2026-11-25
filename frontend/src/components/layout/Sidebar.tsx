import { useState } from 'react';
import { Link, NavLink, type NavLinkRenderProps } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  PenTool,
  Settings,
  LogOut,
  BookOpen,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Download,
} from 'lucide-react';
import { classNames } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Create Assignment', href: '/create-assignment', icon: FileText },
  { name: 'Handwriting Profile', href: '/handwriting-profile', icon: PenTool },
  { name: 'My Assignments', href: '/my-assignments', icon: BookOpen },
  { name: 'Assignment Preview', href: '/assignment-preview', icon: Download },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const bottomNavigation = [
  { name: 'Help & Support', href: '/help', icon: HelpCircle },
];

// Wrapper component for NavLink to handle active state properly
function NavLinkItem({
  to,
  icon: Icon,
  name,
  collapsed
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  collapsed: boolean;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }: NavLinkRenderProps) => classNames(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
        collapsed ? 'justify-center' : '',
        isActive
          ? 'bg-gradient-to-r from-notebook-blue-500 to-notebook-purple-600 text-white shadow-lg shadow-notebook-blue-500/30'
          : 'text-notebook-blue-700 hover:bg-notebook-blue-50 hover:text-notebook-blue-900'
      )}
    >
      {({ isActive }: NavLinkRenderProps) => (
        <>
          <Icon className={classNames('w-5 h-5 flex-shrink-0', isActive ? 'text-white' : '')} aria-hidden="true" />
          {!collapsed && <span>{name}</span>}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  if (typeof window === 'undefined') return null;

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={classNames(
          'fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-notebook-blue-100 transition-all duration-300 flex flex-col',
          collapsed ? 'w-20' : 'w-72',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        aria-label="Main navigation"
      >
        {/* Logo/Brand */}
        <div className={classNames('flex items-center justify-between h-16 px-4 border-b border-notebook-blue-100', collapsed && 'justify-center')}>
          {!collapsed && (
            <Link to="/dashboard" className="flex items-center gap-3" aria-label="Go to dashboard">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-notebook-blue-600 to-notebook-purple-600 flex items-center justify-center shadow-lg">
                <PenTool className="w-5 h-5 text-white" />
              </div>
              <span className="font-heading text-xl text-notebook-blue-800">HandwriteAI</span>
            </Link>
          )}
          {collapsed && (
            <Link to="/dashboard" className="p-2" aria-label="Go to dashboard">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-notebook-blue-600 to-notebook-purple-600 flex items-center justify-center shadow-lg mx-auto">
                <PenTool className="w-5 h-5 text-white" />
              </div>
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto" aria-label="Main navigation">
          <ul className="space-y-1" role="list">
            {navigation.map(item => (
              <li key={item.name}>
                <NavLinkItem
                  to={item.href}
                  icon={item.icon}
                  name={item.name}
                  collapsed={collapsed}
                />
              </li>
            ))}
          </ul>

          {/* Divider */}
          <div className="my-4 border-t border-notebook-blue-100" />

          <ul className="space-y-1" role="list">
            {bottomNavigation.map(item => (
              <li key={item.name}>
                <NavLinkItem
                  to={item.href}
                  icon={item.icon}
                  name={item.name}
                  collapsed={collapsed}
                />
              </li>
            ))}
          </ul>
        </nav>

        {/* User Section */}
        <div className={classNames('p-3 border-t border-notebook-blue-100', collapsed && 'items-center')}>
          {!collapsed && user && (
            <Link to="/settings" className="flex items-center gap-3 p-2 rounded-xl hover:bg-notebook-blue-50 transition-colors">
              <Avatar
                name={user.name}
                src={user.avatar}
                size="md"
                status="online"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-notebook-ink-50 truncate">{user.name}</p>
                <p className="text-xs text-notebook-blue-400 truncate">{user.email}</p>
              </div>
            </Link>
          )}
          {collapsed && user && (
            <Tooltip content="Profile & Settings" position="right">
              <Link to="/settings" className="p-2 rounded-xl hover:bg-notebook-blue-50 transition-colors" aria-label="Profile & Settings">
                <Avatar
                  name={user.name}
                  src={user.avatar}
                  size="md"
                  status="online"
                />
              </Link>
            </Tooltip>
          )}

          {!collapsed && (
            <Button
              variant="ghost"
              fullWidth
              leftIcon={<LogOut className="w-4 h-4" />}
              onClick={logout}
              className="mt-3 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Sign Out
            </Button>
          )}
          {collapsed && (
            <Tooltip content="Sign Out" position="right">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<LogOut className="w-4 h-4" />}
                onClick={logout}
                className="mt-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                aria-label="Sign out"
              >
                <span className="sr-only">Sign Out</span>
              </Button>
            </Tooltip>
          )}
        </div>

        {/* Collapse Toggle */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 lg:static lg:bottom-auto lg:left-auto lg:right-4 lg:top-4 lg:translate-x-0 lg:translate-y-0">
          <Tooltip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} position={collapsed ? 'right' : 'bottom'}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="bg-notebook-blue-50 text-notebook-blue-600 hover:bg-notebook-blue-100 rounded-full shadow-lg"
            >
              {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </Button>
          </Tooltip>
        </div>
      </aside>

      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden fixed top-4 left-4 z-50 bg-white shadow-lg rounded-xl"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </Button>
    </>
  );
}