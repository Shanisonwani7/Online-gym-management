import api, { errorInfo } from '../../api/client';
import CrudPage from '../../components/CrudPage';
import { Badge, Button } from '../../components/ui';
import { formatDateTime, visitLength } from '../../utils/format';

export default function Attendance() {
  const checkOut = async (row, ctx) => {
    try {
      await api.patch(`/attendance/${row.id}/check-out`);
      ctx.notify(`${row.user.name} checked out`);
      ctx.reload();
    } catch (err) {
      ctx.notify(errorInfo(err).message, 'error');
    }
  };

  return (
    <CrudPage
      title="Attendance"
      subtitle="Check members in at the front desk. Only members with an active membership can check in."
      endpoint="/attendance"
      createEndpoint="/attendance/check-in"
      createLabel="Check in member"
      searchable={false}
      allowEdit={false}
      deleteWarning="Delete this attendance record?"
      columns={[
        { key: 'user', label: 'Member', render: (r) => r.user.name },
        { key: 'checkIn', label: 'Checked in', render: (r) => formatDateTime(r.checkIn) },
        { key: 'checkOut', label: 'Checked out', render: (r) => (r.checkOut ? formatDateTime(r.checkOut) : '-') },
        { key: 'length', label: 'Visit length', render: (r) => visitLength(r.checkIn, r.checkOut) },
        { key: 'state', label: 'Status', render: (r) => (r.checkOut ? <Badge tone="white">Finished</Badge> : <Badge tone="green">In the gym</Badge>) },
      ]}
      fields={[
        { name: 'userId', label: 'Member', type: 'select', numeric: true, required: true,
          optionsFrom: { endpoint: '/members', params: { active: true }, toOption: (m) => ({ value: m.id, label: `${m.name} (${m.email})` }) } },
      ]}
      filters={[
        { name: 'open', label: 'Visit', options: [{ value: 'true', label: 'In the gym now' }, { value: 'false', label: 'Finished' }] },
        { name: 'from', label: 'From', type: 'date' },
        { name: 'to', label: 'To', type: 'date' },
      ]}
      rowActions={(row, ctx) => (!row.checkOut ? <Button size="sm" onClick={() => checkOut(row, ctx)}>Check out</Button> : null)}
    />
  );
}
