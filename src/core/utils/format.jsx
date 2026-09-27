export const formatKm = km => {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
};
export const formatDurationMinutes = minutes => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};
export const formatSizeKb = kb => {
  if (kb == null) return '—';
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};
export const formatDate = isoDate => {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) return isoDate;
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date);
};
export const formatRelativeTime = isoTimestamp => {
  const timestamp = Date.parse(isoTimestamp);
  if (!Number.isFinite(timestamp)) return '';
  const diffDays = Math.floor((Date.now() - timestamp) / 86_400_000);
  if (diffDays <= 0) return 'Updated today';
  if (diffDays === 1) return 'Updated yesterday';
  if (diffDays < 30) return `Updated ${diffDays} days ago`;
  return `Updated ${new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric'
  }).format(new Date(timestamp))}`;
};
