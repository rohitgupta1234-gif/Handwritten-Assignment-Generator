import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { classNames } from '../../utils/helpers';
import { Button } from './Button';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  description?: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  searchable?: boolean;
  maxHeight?: number;
}

export function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  error,
  disabled = false,
  fullWidth = true,
  searchable = false,
  maxHeight = 200,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const filteredOptions = searchable
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opt.value.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  const selectedOption = options.find(opt => opt.value === value);

  const handleOptionClick = (option: DropdownOption) => {
    if (!option.disabled) {
      onChange(option.value);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <div ref={dropdownRef} className={classNames(fullWidth ? 'w-full' : '', 'relative')}>
      {label && <label className="label-text">{label}</label>}
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        fullWidth
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        leftIcon={searchable ? null : selectedOption?.icon}
        rightIcon={<ChevronDown className={classNames('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />}
        className={classNames('text-left justify-between', error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20')}
      >
        {selectedOption ? (
          <span className="truncate">{selectedOption.label}</span>
        ) : (
          <span className="text-notebook-blue-300 truncate">{placeholder}</span>
        )}
      </Button>
      {error && <p className="mt-1.5 text-sm text-red-500" role="alert">{error}</p>}

      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-notebook-blue-200 shadow-lg overflow-hidden"
          style={{ maxHeight: `${maxHeight}px` }}
          role="listbox"
          aria-label={label}
        >
          {searchable && (
            <div className="p-2 border-b border-notebook-blue-100">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-notebook-paper-100 border border-notebook-blue-200 rounded-lg focus:outline-none focus:border-notebook-blue-500 focus:ring-2 focus:ring-notebook-blue-500/20"
                autoFocus
              />
            </div>
          )}
          <div className="max-h-[calc(100%-48px)] overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-notebook-blue-400 text-sm">
                No options found
              </div>
            ) : (
              filteredOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={value === option.value}
                  disabled={option.disabled}
                  onClick={() => handleOptionClick(option)}
                  className={classNames(
                    'w-full px-3 py-2.5 text-left text-sm transition-colors',
                    'hover:bg-notebook-blue-50 focus:outline-none',
                    value === option.value ? 'bg-notebook-blue-50 text-notebook-blue-700' : 'text-notebook-ink-50',
                    option.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                    <div className="flex-1 min-w-0">
                      <span className="truncate block">{option.label}</span>
                      {option.description && (
                        <span className="text-xs text-notebook-blue-400 truncate block">{option.description}</span>
                      )}
                    </div>
                    {value === option.value && <Check className="w-4 h-4 text-notebook-blue-600 flex-shrink-0" />}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface MultiSelectProps {
  options: DropdownOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  searchable?: boolean;
  maxHeight?: number;
  maxSelections?: number;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select options',
  label,
  error,
  disabled = false,
  fullWidth = true,
  searchable = true,
  maxHeight = 200,
  maxSelections,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = searchable
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  const handleOptionClick = (option: DropdownOption) => {
    if (option.disabled) return;
    const newValue = value.includes(option.value)
      ? value.filter(v => v !== option.value)
      : maxSelections && value.length >= maxSelections
        ? value
        : [...value, option.value];
    onChange(newValue);
  };

  const selectedOptions = options.filter(opt => value.includes(opt.value));

  return (
    <div ref={dropdownRef} className={classNames(fullWidth ? 'w-full' : '', 'relative')}>
      {label && <label className="label-text">{label}</label>}
      <Button
        type="button"
        variant="outline"
        fullWidth
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        rightIcon={<ChevronDown className={classNames('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />}
        className={classNames('text-left justify-between min-h-[56px] py-2', error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20')}
      >
        <div className="flex flex-wrap gap-1.5 w-full">
          {selectedOptions.length > 0 ? (
            selectedOptions.map(opt => (
              <span key={opt.value} className="inline-flex items-center gap-1 px-2 py-0.5 bg-notebook-blue-100 text-notebook-blue-700 text-sm rounded-full">
                {opt.label}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); handleOptionClick(opt); }}
                  className="ml-1 p-0.5 hover:bg-notebook-blue-200 rounded-full"
                  aria-label={`Remove ${opt.label}`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))
          ) : (
            <span className="text-notebook-blue-300">{placeholder}</span>
          )}
        </div>
      </Button>
      {error && <p className="mt-1.5 text-sm text-red-500" role="alert">{error}</p>}

      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-notebook-blue-200 shadow-lg overflow-hidden"
          style={{ maxHeight: `${maxHeight}px` }}
          role="listbox"
          aria-label={label}
        >
          {searchable && (
            <div className="p-2 border-b border-notebook-blue-100">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-notebook-paper-100 border border-notebook-blue-200 rounded-lg focus:outline-none focus:border-notebook-blue-500 focus:ring-2 focus:ring-notebook-blue-500/20"
                autoFocus
              />
            </div>
          )}
          <div className="max-h-[calc(100%-48px)] overflow-y-auto">
            {filteredOptions.map(option => {
              const isDisabled = option.disabled || !!(maxSelections && value.length >= maxSelections && !value.includes(option.value));
              return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={value.includes(option.value)}
                aria-checked={value.includes(option.value)}
                disabled={isDisabled}
                onClick={() => handleOptionClick(option)}
                className={classNames(
                  'w-full px-3 py-2.5 text-left text-sm transition-colors',
                  'hover:bg-notebook-blue-50 focus:outline-none',
                  value.includes(option.value) ? 'bg-notebook-blue-50 text-notebook-blue-700' : 'text-notebook-ink-50',
                  isDisabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={classNames(
                    'w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center',
                    value.includes(option.value)
                      ? 'border-notebook-blue-600 bg-notebook-blue-600'
                      : 'border-notebook-blue-300'
                  )}>
                    {value.includes(option.value) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                  <div className="flex-1 min-w-0">
                    <span className="truncate block">{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-notebook-blue-400 truncate block">{option.description}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}