import DOMPurify from 'dompurify';

/**
 * Client-side HTML sanitization using DOMPurify
 * Removes all potentially dangerous HTML/JS content while preserving safe formatting
 */

// Sanitization configuration for client-side
const SANITIZE_CONFIG = {
  // Allow only safe tags
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'hr',
  ],
  // Allow only safe attributes
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'id',
    'style', 'width', 'height', 'align',
    'colspan', 'rowspan',
  ],
  // Safe URI protocols
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  // Remove disallowed elements completely
  KEEP_CONTENT: false,
  // Return trusted HTML
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_TRUSTED_TYPE: false,
};

/**
 * Sanitize HTML string to prevent XSS
 * @param html - Raw HTML string from user input
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(html, SANITIZE_CONFIG);
}

/**
 * Sanitize plain text for safe insertion into HTML
 * Escapes HTML special characters
 * @param text - Plain text from user input
 * @returns HTML-escaped string
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}