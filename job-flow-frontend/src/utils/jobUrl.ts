// People often paste "linkedin.com/jobs/view/123" without the scheme; treat that as https.
// Anything that already names a scheme is left alone, so "javascript:..." stays invalid.
export function normalizeJobUrl(input: string): string {
  const url = input.trim();
  if (!url) return '';
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
}

// Same rule as the backend: http(s) with a host. Also used before rendering a link,
// so an odd value that slipped in never becomes a clickable script link.
export function isWebUrl(url: string | null | undefined): url is string {
  if (!url || /\s/.test(url)) return false;
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname !== '';
  } catch {
    return false;
  }
}
