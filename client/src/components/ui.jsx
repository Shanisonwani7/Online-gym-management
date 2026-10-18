import { useEffect } from 'react';
import { label } from '../utils/format';

export function Spinner({ className = '' }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-line border-t-plate-blue ${className}`}
    />
  );
}

export function PageSpinner() {
  return <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>;
}

const ALERT_TONES = {
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-green-200 bg-green-50 text-green-800',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
};

export function Alert({ tone = 'error', children, onClose }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm ${ALERT_TONES[tone]}`}>
      <div>{children}</div>
      {onClose && <button type="button" onClick={onClose} aria-label="Dismiss" className="font-medium">x</button>}
    </div>
  );
}

export function Button({ variant = 'primary', size, className = '', type = 'button', ...props }) {
  return <button type={type} className={`btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''} ${className}`} {...props} />;
}

const DOT = {
  green: 'bg-plate-green',
  yellow: 'bg-plate-yellow',
  red: 'bg-plate-red',
  blue: 'bg-plate-blue',
  white: 'bg-white border border-slate-400',
};

// A small plate-coloured disc followed by text, so status never relies on colour alone.
export function Badge({ tone = 'white', children }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
      <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${DOT[tone]}`} />
      {children}
    </span>
  );
}

const STATUS_TONE = { ACTIVE: 'green', PENDING: 'yellow', CANCELLED: 'red', EXPIRED: 'white' };
const LEVEL_TONE = { BEGINNER: 'green', INTERMEDIATE: 'yellow', ADVANCED: 'red' };

export const StatusBadge = ({ status }) => (status ? <Badge tone={STATUS_TONE[status] || 'white'}>{label(status)}</Badge> : <span className="text-muted">None</span>);
export const DifficultyBadge = ({ level }) => <Badge tone={LEVEL_TONE[level] || 'white'}>{label(level)}</Badge>;
export const ActiveBadge = ({ active }) => <Badge tone={active ? 'green' : 'white'}>{active ? 'Active' : 'Inactive'}</Badge>;

export function Modal({ title, onClose, wide = false, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-ink/60 p-4 sm:items-center"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-modal="true" aria-label={title} className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-md border border-line bg-white`}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded px-2 text-lg text-muted hover:text-ink">x</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label: text, htmlFor, error, hint, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">{text}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-plate-red">{error}</p>}
    </div>
  );
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.total === 0) return null;
  return (
    <div className="flex items-center justify-between gap-3 pt-3 text-sm text-muted">
      <span>Page {meta.page} of {meta.totalPages} ({meta.total} total)</span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>Previous</Button>
        <Button variant="secondary" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>Next</Button>
      </div>
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <p className="mt-1 text-sm text-muted">{children}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-4xl font-semibold leading-none">{title}</h1>
        {subtitle && <p className="mt-2 max-w-prose text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function StatCard({ label: text, value, hint }) {
  return (
    <div className="panel p-4">
      <p className="text-sm text-muted">{text}</p>
      <p className="mt-1 font-display text-4xl font-semibold leading-none">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </div>
  );
}

// Simple read-only table used on dashboards and detail pages.
export function SimpleTable({ columns, rows, empty = 'Nothing here yet.' }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr>{columns.map((c) => <th key={c.key} scope="col">{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={columns.length}><EmptyState title={empty} /></td></tr>}
          {rows.map((row) => (
            <tr key={row.id}>{columns.map((c) => <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
