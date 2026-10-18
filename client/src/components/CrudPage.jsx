import { useCallback, useEffect, useState } from 'react';
import api, { errorInfo } from '../api/client';
import { Alert, Button, EmptyState, Modal, PageHeader, Pagination, Spinner } from './ui';

const blank = (f) => (f.type === 'checkbox' ? Boolean(f.default) : (f.default !== undefined ? f.default : ''));
const isNumeric = (f) => f.type === 'number' || f.numeric;

function buildPayload(fields, values) {
  const out = {};
  for (const f of fields) {
    const v = values[f.name];
    if (f.type === 'checkbox') { out[f.name] = Boolean(v); continue; }
    if (v === '' || v === null || v === undefined) {
      if (f.type === 'password' || f.omitEmpty) continue;
      out[f.name] = isNumeric(f) ? null : '';
      continue;
    }
    out[f.name] = isNumeric(f) ? Number(v) : v;
  }
  return out;
}

function validateFields(fields, values) {
  const errors = {};
  for (const f of fields) {
    const v = values[f.name];
    const empty = v === '' || v === null || v === undefined;
    if (f.required && f.type !== 'checkbox' && empty) { errors[f.name] = `${f.label} is required`; continue; }
    if (empty) continue;
    if (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(v)) errors[f.name] = 'Enter a valid email address';
    if (f.type === 'number') {
      if (Number.isNaN(Number(v))) errors[f.name] = 'Enter a number';
      else if (f.min !== undefined && Number(v) < f.min) errors[f.name] = `Must be at least ${f.min}`;
      else if (f.max !== undefined && Number(v) > f.max) errors[f.name] = `Must be at most ${f.max}`;
    }
    if (f.type === 'password' && (v.length < 8 || !/[A-Za-z]/.test(v) || !/[0-9]/.test(v))) {
      errors[f.name] = 'Use at least 8 characters with a letter and a number';
    }
  }
  return errors;
}

/**
 * Generic list + create/edit/delete screen backed by a paginated REST endpoint.
 * fields: [{ name, label, type, required, options | optionsFrom, createOnly, editOnly, ... }]
 */
export default function CrudPage({
  title, subtitle, endpoint, createEndpoint, columns, fields = [], filters = [],
  searchable = true, searchPlaceholder = 'Search', allowCreate = true, allowEdit = true, allowDelete = true,
  createLabel = 'Add', toForm, rowActions, pageSize = 10, deleteWarning,
}) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filterValues, setFilterValues] = useState({});
  const [tick, setTick] = useState(0);

  const [modal, setModal] = useState(null);
  const [values, setValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [lookups, setLookups] = useState({});

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const notify = useCallback((text, tone = 'success') => setNotice({ text, tone }), []);

  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    const params = { page, pageSize };
    if (query) params.search = query;
    Object.entries(filterValues).forEach(([k, v]) => { if (v !== '') params[k] = v; });
    api.get(endpoint, { params })
      .then((res) => {
        if (!alive) return;
        setRows(res.data.data);
        setMeta(res.data.meta);
        if (res.data.data.length === 0 && page > 1) setPage(page - 1);
      })
      .catch((err) => alive && setError(errorInfo(err).message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [endpoint, page, pageSize, query, filterValues, tick]);

  // Static lookups (selects filled from another endpoint) load once.
  useEffect(() => {
    fields.filter((f) => f.optionsFrom && !f.optionsFrom.dependsOn).forEach((f) => {
      api.get(f.optionsFrom.endpoint, { params: { pageSize: 100, ...f.optionsFrom.params } })
        .then((res) => setLookups((l) => ({ ...l, [f.name]: res.data.data.map(f.optionsFrom.toOption) })))
        .catch(() => setLookups((l) => ({ ...l, [f.name]: [] })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dependent lookups (e.g. memberships of the chosen member) refetch when their parent value changes.
  const dependentFields = fields.filter((f) => f.optionsFrom && f.optionsFrom.dependsOn);
  const dependencyKey = dependentFields.map((f) => values[f.optionsFrom.dependsOn]).join('|');
  useEffect(() => {
    if (!modal) return;
    dependentFields.forEach((f) => {
      const parent = values[f.optionsFrom.dependsOn];
      if (!parent) { setLookups((l) => ({ ...l, [f.name]: [] })); return; }
      api.get(f.optionsFrom.endpoint, { params: { pageSize: 100, ...f.optionsFrom.params(parent) } })
        .then((res) => setLookups((l) => ({ ...l, [f.name]: res.data.data.map(f.optionsFrom.toOption) })))
        .catch(() => setLookups((l) => ({ ...l, [f.name]: [] })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal, dependencyKey]);

  const visibleFields = modal ? fields.filter((f) => (modal.mode === 'create' ? !f.editOnly : !f.createOnly)) : [];
  const close = useCallback(() => setModal(null), []);

  const openCreate = () => {
    setValues(Object.fromEntries(fields.filter((f) => !f.editOnly).map((f) => [f.name, blank(f)])));
    setFieldErrors({}); setFormError(''); setModal({ mode: 'create' });
  };

  const openEdit = (row) => {
    const source = toForm ? toForm(row) : row;
    setValues(Object.fromEntries(fields.filter((f) => !f.createOnly).map((f) => [f.name, source[f.name] === null || source[f.name] === undefined ? blank(f) : source[f.name]])));
    setFieldErrors({}); setFormError(''); setModal({ mode: 'edit', row });
  };

  const setValue = (name, value) => {
    setValues((v) => {
      const next = { ...v, [name]: value };
      // A dependent select (e.g. memberships of the chosen member) is cleared when its parent changes.
      fields.forEach((f) => { if (f.optionsFrom && f.optionsFrom.dependsOn === name) next[f.name] = ''; });
      return next;
    });
    setFieldErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errors = validateFields(visibleFields, values);
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload = buildPayload(visibleFields, values);
      if (modal.mode === 'create') await api.post(createEndpoint || endpoint, payload);
      else await api.put(`${endpoint}/${modal.row.id}`, payload);
      setModal(null);
      setNotice({ text: modal.mode === 'create' ? 'Saved' : 'Changes saved', tone: 'success' });
      reload();
    } catch (err) {
      const info = errorInfo(err);
      setFormError(info.message);
      setFieldErrors(info.fields);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(deleteWarning || 'Delete this record? This cannot be undone.')) return;
    try {
      await api.delete(`${endpoint}/${row.id}`);
      setNotice({ text: 'Deleted', tone: 'success' });
      reload();
    } catch (err) {
      setError(errorInfo(err).message);
    }
  };

  const setFilter = (name, value) => { setFilterValues((f) => ({ ...f, [name]: value })); setPage(1); };
  const hasActions = allowEdit || allowDelete || rowActions;

  const renderInput = (f) => {
    const id = `f-${f.name}`;
    const common = { id, className: 'input', value: values[f.name] === undefined ? '' : values[f.name], 'aria-invalid': Boolean(fieldErrors[f.name]) };
    if (f.type === 'textarea') return <textarea {...common} rows={3} onChange={(e) => setValue(f.name, e.target.value)} />;
    if (f.type === 'checkbox') {
      return (
        <label className="flex items-center gap-2 text-sm">
          <input id={id} type="checkbox" checked={Boolean(values[f.name])} onChange={(e) => setValue(f.name, e.target.checked)} />
          {f.checkboxLabel || 'Yes'}
        </label>
      );
    }
    if (f.type === 'select') {
      const options = f.options || lookups[f.name] || [];
      return (
        <select {...common} onChange={(e) => setValue(f.name, e.target.value)}>
          <option value="">{f.required ? 'Select...' : 'None'}</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    return (
      <input
        {...common}
        type={f.type || 'text'}
        step={f.step}
        min={f.min}
        max={f.max}
        autoComplete={f.type === 'password' ? 'new-password' : 'off'}
        onChange={(e) => setValue(f.name, e.target.value)}
      />
    );
  };

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle}>
        {allowCreate && <Button onClick={openCreate}>{createLabel}</Button>}
      </PageHeader>

      {notice && <div className="mb-3"><Alert tone={notice.tone} onClose={() => setNotice(null)}>{notice.text}</Alert></div>}
      {error && <div className="mb-3"><Alert onClose={() => setError('')}>{error}</Alert></div>}

      {(searchable || filters.length > 0) && (
        <div className="mb-3 flex flex-wrap items-end gap-3">
          {searchable && (
            <div className="min-w-[200px] flex-1">
              <label htmlFor="search" className="label">Search</label>
              <input id="search" className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={searchPlaceholder} />
            </div>
          )}
          {filters.map((f) => (
            <div key={f.name}>
              <label htmlFor={`filter-${f.name}`} className="label">{f.label}</label>
              {f.type === 'date' ? (
                <input id={`filter-${f.name}`} type="date" className="input" value={filterValues[f.name] || ''} onChange={(e) => setFilter(f.name, e.target.value)} />
              ) : (
                <select id={`filter-${f.name}`} className="input" value={filterValues[f.name] || ''} onChange={(e) => setFilter(f.name, e.target.value)}>
                  <option value="">All</option>
                  {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => <th key={c.key} scope="col">{c.label}</th>)}
              {hasActions && <th scope="col" className="text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={columns.length + 1}><div className="flex justify-center py-8"><Spinner /></div></td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={columns.length + 1}>
                <EmptyState title={query || Object.values(filterValues).some(Boolean) ? 'No results match your search' : `No ${title.toLowerCase()} yet`}>
                  {allowCreate && !query ? `Use "${createLabel}" to add the first one.` : 'Try a different search or clear the filters.'}
                </EmptyState>
              </td></tr>
            )}
            {!loading && rows.map((row) => (
              <tr key={row.id}>
                {columns.map((c) => <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>)}
                {hasActions && (
                  <td>
                    <div className="flex justify-end gap-2">
                      {rowActions && rowActions(row, { reload, notify })}
                      {allowEdit && <Button variant="secondary" size="sm" onClick={() => openEdit(row)}>Edit</Button>}
                      {allowDelete && <Button variant="danger" size="sm" onClick={() => remove(row)}>Delete</Button>}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination meta={meta} onPage={setPage} />

      {modal && (
        <Modal title={modal.mode === 'create' ? createLabel : `Edit ${title.replace(/s$/, '').toLowerCase()}`} onClose={close}>
          <form onSubmit={submit} noValidate className="space-y-4">
            {formError && <Alert>{formError}</Alert>}
            {visibleFields.map((f) => (
              <div key={`${modal.mode}-${f.name}`}>
                {f.type === 'checkbox' ? (
                  <>
                    <span className="label">{f.label}</span>
                    {renderInput(f)}
                  </>
                ) : (
                  <>
                    <label htmlFor={`f-${f.name}`} className="label">{f.label}{f.required ? ' *' : ''}</label>
                    {renderInput(f)}
                    {f.hint && !fieldErrors[f.name] && <p className="mt-1 text-xs text-muted">{f.hint}</p>}
                  </>
                )}
                {fieldErrors[f.name] && <p className="mt-1 text-xs text-plate-red">{fieldErrors[f.name]}</p>}
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={close}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
