export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return validTypes.includes(file.type);
}

export function isValidPdfFile(file: File): boolean {
  return file.type === 'application/pdf';
}

export function createObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}

export function revokeObjectUrl(url: string): void {
  URL.revokeObjectURL(url);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getSubjectColor(subjectId: string): string {
  const colors: Record<string, string> = {
    mathematics: '#3b82f6',
    physics: '#ef4444',
    chemistry: '#22c55e',
    biology: '#8b5cf6',
    'computer-science': '#f59e0b',
    english: '#ec4899',
    history: '#6b7280',
    geography: '#06b6d4',
    economics: '#84cc16',
    other: '#9ca3af',
  };
  return colors[subjectId] || '#9ca3af';
}

export function getSubjectIcon(subjectId: string): string {
  const icons: Record<string, string> = {
    mathematics: 'calculator',
    physics: 'atom',
    chemistry: 'flask-conical',
    biology: 'dna',
    'computer-science': 'cpu',
    english: 'book-open',
    history: 'landmark',
    geography: 'globe',
    economics: 'trending-up',
    other: 'folder',
  };
  return icons[subjectId] || 'folder';
}

export const PAGE_SIZES = {
  A4: { width: 794, height: 1123, name: 'A4 (210 × 297 mm)' },
  A5: { width: 559, height: 794, name: 'A5 (148 × 210 mm)' },
  Letter: { width: 816, height: 1056, name: 'Letter (8.5 × 11 in)' },
  Legal: { width: 816, height: 1344, name: 'Legal (8.5 × 14 in)' },
} as const;

export type PageSizeKey = keyof typeof PAGE_SIZES;

export function getPageDimensions(size: PageSizeKey | 'Custom', customWidth?: number, customHeight?: number) {
  if (size === 'Custom') {
    if (customWidth && customHeight) {
      return { width: customWidth, height: customHeight };
    }
    return PAGE_SIZES.A4;
  }
  return PAGE_SIZES[size] || PAGE_SIZES.A4;
}

export function calculatePagesNeeded(
  contentHeight: number,
  pageHeight: number,
  marginTop: number,
  marginBottom: number
): number {
  const usableHeight = pageHeight - marginTop - marginBottom;
  return Math.max(1, Math.ceil(contentHeight / usableHeight));
}