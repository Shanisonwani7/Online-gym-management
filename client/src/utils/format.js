const CURRENCY = import.meta.env.VITE_CURRENCY || 'INR';

export const money = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: CURRENCY, maximumFractionDigits: 2 }).format(Number(value || 0));

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '-';

export const toInputDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

// BANK_TRANSFER -> Bank transfer
export const label = (value) => (value ? value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ') : '');

export function visitLength(checkIn, checkOut) {
  if (!checkOut) return 'In progress';
  const minutes = Math.round((new Date(checkOut) - new Date(checkIn)) / 60000);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}
