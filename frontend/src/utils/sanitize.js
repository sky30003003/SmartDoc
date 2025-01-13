import DOMPurify from 'dompurify';

export const sanitizeHtml = (dirty) => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['div', 'span', 'p', 'br'],
    ALLOWED_ATTR: ['style', 'class']
  });
}; 