import React from 'react';
import { classNames } from '../../utils/helpers';

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  badge?: string | number;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline' | 'notebook';
  fullWidth?: boolean;
  className?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  fullWidth = false,
  className,
}: TabsProps) {
  const variantClasses = {
    default: 'bg-notebook-paper-100 rounded-xl p-1',
    pills: '',
    underline: 'border-b border-notebook-blue-200',
    notebook: 'bg-notebook-paper-100 rounded-xl p-1 border border-notebook-blue-100',
  };

  const tabClasses = {
    default: 'px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
    pills: 'px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
    underline: 'px-4 py-3 -mb-px border-b-2 text-sm font-medium transition-all duration-200',
    notebook: 'px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
  };

  const activeTabClasses = {
    default: 'bg-white text-notebook-blue-700 shadow-sm',
    pills: 'bg-notebook-blue-600 text-white shadow-lg shadow-notebook-blue-500/25',
    underline: 'border-notebook-blue-600 text-notebook-blue-700',
    notebook: 'bg-white text-notebook-blue-700 shadow-sm',
  };

  const inactiveTabClasses = {
    default: 'text-notebook-blue-500 hover:text-notebook-blue-700 hover:bg-notebook-blue-50',
    pills: 'text-notebook-blue-500 hover:text-notebook-blue-700 hover:bg-notebook-blue-50',
    underline: 'text-notebook-blue-400 hover:text-notebook-blue-600 border-transparent',
    notebook: 'text-notebook-blue-500 hover:text-notebook-blue-700 hover:bg-notebook-blue-50',
  };

  return (
    <div className={classNames('w-full', fullWidth && 'w-full', className)} role="tablist">
      <div className={classNames('flex gap-1', variantClasses[variant])}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => !tab.disabled && onChange(tab.id)}
            disabled={tab.disabled}
            className={classNames(
              'flex items-center gap-2 whitespace-nowrap',
              tabClasses[variant],
              activeTab === tab.id ? activeTabClasses[variant] : inactiveTabClasses[variant],
              tab.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            {tab.label}
            {tab.badge && (
              <span className={classNames(
                'px-1.5 py-0.5 text-xs rounded-full',
                activeTab === tab.id
                  ? variant === 'pills' ? 'bg-white/20 text-white' : 'bg-notebook-blue-100 text-notebook-blue-700'
                  : 'bg-notebook-blue-100 text-notebook-blue-700'
              )}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

interface TabPanelsProps {
  tabs: TabItem[];
  activeTab: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanels({ tabs, activeTab, children, className }: TabPanelsProps) {
  return (
    <div className={className} role="tabpanel">
      {tabs.map(tab => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={activeTab !== tab.id}
          className="animate-fade-in"
        >
          {activeTab === tab.id && children}
        </div>
      ))}
    </div>
  );
}

interface TabPanelProps {
  tabId: string;
  activeTab: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ tabId, activeTab, children, className }: TabPanelProps) {
  if (activeTab !== tabId) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${tabId}`}
      aria-labelledby={`tab-${tabId}`}
      className={classNames('animate-fade-in', className)}
    >
      {children}
    </div>
  );
}