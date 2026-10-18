import { useState } from 'react';
import api, { errorInfo } from '../../api/client';
import { Alert, Badge, Button, PageHeader, PageSpinner, Pagination, SimpleTable } from '../../components/ui';
import useApi from '../../hooks/useApi';
import { formatDateTime, visitLength } from '../../utils/format';

export default function MyAttendance() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi('/me/attendance', { page, pageSize: 10 });
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const toggle = async (checkedIn) => {
    setBusy(true);
    setMessage(null);
    try {
      await api.post(checkedIn ? '/me/attendance/check-out' : '/me/attendance/check-in');
      setMessage({ tone: 'success', text: checkedIn ? 'Checked out' : 'Checked in' });
      reload();
    } catch (err) {
      setMessage({ tone: 'error', text: errorInfo(err).message });
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <PageSpinner />;
  if (error) return <Alert>{error}</Alert>;
  const checkedIn = Boolean(data.open);

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" subtitle="Check in when you arrive and check out when you leave.">
        <Button onClick={() => toggle(checkedIn)} disabled={busy}>{checkedIn ? 'Check out' : 'Check in'}</Button>
      </PageHeader>
      {message && <Alert tone={message.tone} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <SimpleTable
        empty="No visits recorded yet."
        rows={data.data}
        columns={[
          { key: 'checkIn', label: 'Checked in', render: (r) => formatDateTime(r.checkIn) },
          { key: 'checkOut', label: 'Checked out', render: (r) => (r.checkOut ? formatDateTime(r.checkOut) : '-') },
          { key: 'length', label: 'Length', render: (r) => visitLength(r.checkIn, r.checkOut) },
          { key: 'state', label: 'Status', render: (r) => (r.checkOut ? <Badge tone="white">Finished</Badge> : <Badge tone="green">In the gym</Badge>) },
        ]}
      />
      <Pagination meta={data.meta} onPage={setPage} />
    </div>
  );
}
