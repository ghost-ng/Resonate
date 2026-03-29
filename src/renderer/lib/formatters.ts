/** Format milliseconds as MM:SS */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Format seconds as a human-readable duration like "12m" or "1h 5m" */
export function formatDurationShort(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/** Format milliseconds as HH:MM:SS timestamp */
export function formatTimestamp(ms: number): string {
  if (!isFinite(ms) || isNaN(ms)) return '--:--';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Format ISO date string as relative date */
export function formatRelativeDate(isoDate: string): string {
  const date = parseDate(isoDate);
  const now = new Date();

  // Compare calendar dates in local timezone to avoid UTC offset issues
  const dateLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((nowLocal.getTime() - dateLocal.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Parse a date string, treating SQLite timestamps as UTC */
function parseDate(isoDate: string): Date {
  const s = isoDate.endsWith('Z') || isoDate.includes('+') || isoDate.includes('T') ? isoDate : isoDate + 'Z';
  return new Date(s);
}

/** Format ISO date as a display date string in local time */
export function formatDate(isoDate: string): string {
  return parseDate(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
