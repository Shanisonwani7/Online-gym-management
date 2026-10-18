import api, { errorInfo } from '../../api/client';
import CrudPage from '../../components/CrudPage';
import { Button, StatusBadge } from '../../components/ui';
import { formatDate, money } from '../../utils/format';

const STATUS_OPTIONS = ['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED'].map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }));

export default function Memberships() {
  const setStatus = async (row, status, ctx) => {
    try {
      await api.patch(`/memberships/${row.id}/status`, { status });
      ctx.notify(status === 'ACTIVE' ? 'Membership activated, starting today' : 'Membership cancelled');
      ctx.reload();
    } catch (err) {
      ctx.notify(errorInfo(err).message, 'error');
    }
  };

  return (
    <CrudPage
      title="Memberships"
      subtitle="Create memberships directly, or activate the pending requests members send from their dashboard."
      endpoint="/memberships"
      createLabel="Add membership"
      searchable={false}
      allowEdit={false}
      columns={[
        { key: 'user', label: 'Member', render: (r) => <span><span className="font-medium">{r.user.name}</span><br /><span className="text-xs text-muted">{r.user.email}</span></span> },
        { key: 'plan', label: 'Plan', render: (r) => `${r.plan.name} (${money(r.plan.price)})` },
        { key: 'startDate', label: 'Starts', render: (r) => formatDate(r.startDate) },
        { key: 'endDate', label: 'Ends', render: (r) => formatDate(r.endDate) },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
      ]}
      fields={[
        { name: 'userId', label: 'Member', type: 'select', numeric: true, required: true, createOnly: true,
          optionsFrom: { endpoint: '/members', params: { active: true }, toOption: (m) => ({ value: m.id, label: `${m.name} (${m.email})` }) } },
        { name: 'planId', label: 'Plan', type: 'select', numeric: true, required: true, createOnly: true,
          optionsFrom: { endpoint: '/plans', params: { active: true }, toOption: (p) => ({ value: p.id, label: `${p.name} (${money(p.price)})` }) } },
        { name: 'startDate', label: 'Start date', type: 'date', omitEmpty: true, createOnly: true, hint: 'Leave blank to start today' },
        { name: 'status', label: 'Status', type: 'select', required: true, createOnly: true, default: 'ACTIVE',
          options: [{ value: 'ACTIVE', label: 'Active now' }, { value: 'PENDING', label: 'Pending payment' }] },
      ]}
      filters={[{ name: 'status', label: 'Status', options: STATUS_OPTIONS }]}
      deleteWarning="Delete this membership record? Payments linked to it are kept."
      rowActions={(row, ctx) => (
        <>
          {row.status !== 'ACTIVE' && <Button size="sm" onClick={() => setStatus(row, 'ACTIVE', ctx)}>Activate</Button>}
          {(row.status === 'ACTIVE' || row.status === 'PENDING') && <Button variant="secondary" size="sm" onClick={() => setStatus(row, 'CANCELLED', ctx)}>Cancel</Button>}
        </>
      )}
    />
  );
}
