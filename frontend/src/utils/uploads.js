const API_ORIGIN =
  (process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/+$/, '') : '') ||
  (typeof window !== 'undefined' ? window.location.origin : '');

const HTTP_PATTERN = /^https?:\/\//i;

export function getApiOrigin() {
  return API_ORIGIN;
}

export function normalizeUploadPath(src) {
  if (!src) return '';
  const value = String(src).trim();
  if (!value) return '';
  if (HTTP_PATTERN.test(value)) return value;
  const normalized = value.replace(/\\/g, '/');
  const withoutLeadingSlash = normalized.replace(/^\/+/, '');
  if (withoutLeadingSlash.startsWith('uploads/')) {
    return `/${withoutLeadingSlash}`;
  }
  return `/uploads/${withoutLeadingSlash}`;
}

export function resolveUploadUrl(src, origin = API_ORIGIN) {
  if (!src) return '';
  const normalized = normalizeUploadPath(src);
  if (!normalized || HTTP_PATTERN.test(normalized)) {
    return normalized;
  }
  return `${origin}${normalized}`;
}
