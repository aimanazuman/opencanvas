import DOMPurify from 'dompurify';

/**
 * Sanitize a string to prevent XSS attacks.
 * Strips all HTML tags and dangerous content.
 */
export function sanitizeText(input) {
  if (!input || typeof input !== 'string') return input;
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * Sanitize HTML content, allowing safe tags only.
 * Use this for rich text content.
 */
export function sanitizeHTML(input) {
  if (!input || typeof input !== 'string') return input;
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize an object's string values recursively.
 * Useful for sanitizing form data before sending to API.
 * Password fields are excluded from sanitization.
 */
export function sanitizeFormData(data) {
  if (!data || typeof data !== 'object') return data;
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      if (key.toLowerCase().includes('password')) {
        sanitized[key] = value;
      } else {
        sanitized[key] = sanitizeText(value);
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeFormData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
