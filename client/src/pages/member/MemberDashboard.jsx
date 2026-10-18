import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorInfo } from '../../api/client';
import { Alert, Button, PageHeader, PageSpinner, SimpleTable, StatCard, StatusBadge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import useApi from '../../hooks/useApi';
import { formatDate, formatDateTime, money, visitLength } from '../../utils/format';

export default function MemberDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi('/dashboard/member');
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <PageSpinner />;
  if (error) return <Alert>{error}</Alert>;
  const { membership, pendingMembership, trainer, stats, checkedIn, recentAttendance, lastPayment } = data;

  const toggleVisit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await api.post(checkedIn ? '/me/attendance/check-out' : '/me/attendance/check-in');
      setMessage({ tone: 'success', text: checkedIn ? 'You are checked out. Nice work.' : 'You are checked in.' });
      reload();
    } catch (err) {
      setMessage({ tone: 'error', text: errorInfo(err).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title={`Welcome, ${user.name.split(' ')[0]}`} subtitle="Your membership, visits and training at a glance.">
        <Button onClick={toggleVisit} disabled={busy || (!membership && !checkedIn)}>{checkedIn ? 'Check out' : 'Check in'}</Button>
      </PageHeader>

      {message && <Alert tone={message.tone} onClose={() => setMessage(null)}>{message.text}</Alert>}

      {!membership && pendingMembership && (
        <Alert tone="info">Your request for the {pendingMembership.plan.name} plan is waiting for payment. Pay at the front desk and it will be activated.</Alert>
      )}
      {!membership && !pendingMembership && (
        <Alert tone="info">You do not have an active membership. <Link to="/member/membership" className="font-medium underline">Choose a plan</Link> to start checking in.</Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Days left on your plan"
          value={membership ? membership.daysLeft : '-'}
          hint={membership ? `${membership.plan.name}, ends ${formatDate(membership.endDate)}` : 'No active membership'}
        />
        <StatCard label="Visits this month" value={stats.visitsThisMonth} />
        <StatCard label="Workout plans" value={stats.workouts} hint={stats.workouts ? 'Assigned to you' : 'Ask your trainer for one'} />
        <StatCard label="Last payment" value={lastPayment ? money(lastPayment.amount) : '-'} hint={lastPayment ? formatDate(lastPayment.paidAt) : 'No payments yet'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="panel p-5">
          <h2 className="text-2xl font-semibold">Membership</h2>
          {membership ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Plan</dt><dd className="font-medium">{membership.plan.name}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Status</dt><dd><StatusBadge status={membership.status} /></dd></div>
              <div className="flex justify-between"><dt className="text-muted">Started</dt><dd>{formatDate(membership.startDate)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Ends</dt><dd>{formatDate(membership.endDate)}</dd></div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted">Nothing active right now.</p>
          )}
          <Link to="/member/membership" className="btn btn-secondary mt-4">Plans and payments</Link>
        </section>

        <section className="panel p-5">
          <h2 className="text-2xl font-semibold">Your trainer</h2>
          {trainer ? (
            <div className="mt-3 text-sm">
              <p className="font-medium">{trainer.name}</p>
              <p className="text-muted">{trainer.specialization}</p>
              {trainer.phone && <p className="mt-2">Phone: {trainer.phone}</p>}
              <p>Email: {trainer.email}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">No trainer assigned yet. The front desk can assign one.</p>
          )}
        </section>

        <section className="panel p-5">
          <h2 className="text-2xl font-semibold">Right now</h2>
          <p className="mt-3 text-sm">{checkedIn ? 'You are checked in at the gym.' : 'You are not checked in.'}</p>
          <Link to="/member/workouts" className="btn btn-secondary mt-4">View my workouts</Link>
        </section>
      </div>

      <section>
        <h2 className="mb-2 text-2xl font-semibold">Recent visits</h2>
        <SimpleTable
          empty="No visits yet. Check in to record your first one."
          rows={recentAttendance}
          columns={[
            { key: 'checkIn', label: 'Checked in', render: (r) => formatDateTime(r.checkIn) },
            { key: 'checkOut', label: 'Checked out', render: (r) => (r.checkOut ? formatDateTime(r.checkOut) : '-') },
            { key: 'length', label: 'Length', render: (r) => visitLength(r.checkIn, r.checkOut) },
          ]}
        />
      </section>
    </div>
  );
}
