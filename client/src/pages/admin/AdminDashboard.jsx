import { Link } from 'react-router-dom';
import { Alert, PageHeader, PageSpinner, SimpleTable, StatCard } from '../../components/ui';
import useApi from '../../hooks/useApi';
import { formatDate, formatDateTime, label, money } from '../../utils/format';

export default function AdminDashboard() {
  const { data, loading, error } = useApi('/dashboard/admin');
  if (loading) return <PageSpinner />;
  if (error) return <Alert>{error}</Alert>;
  const { stats, expiringSoon, recentPayments, recentAttendance } = data;

  return (
    <div>
      <PageHeader title="Overview" subtitle="Today's activity, revenue and the memberships that need attention." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Members" value={stats.totalMembers} />
        <StatCard label="Active memberships" value={stats.activeMemberships} />
        <StatCard label="Waiting for payment" value={stats.pendingMemberships} hint="Pending requests from members" />
        <StatCard label="Active trainers" value={stats.trainers} />
        <StatCard label="Check-ins today" value={stats.checkInsToday} />
        <StatCard label="In the gym now" value={stats.inGymNow} />
        <StatCard label="Revenue this month" value={money(stats.monthRevenue)} />
        <StatCard label="Total revenue" value={money(stats.totalRevenue)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-2xl font-semibold">Expiring within 7 days</h2>
          <SimpleTable
            empty="No memberships expire this week."
            rows={expiringSoon}
            columns={[
              { key: 'user', label: 'Member', render: (r) => <Link className="text-plate-blue underline" to={`/admin/members/${r.user.id}`}>{r.user.name}</Link> },
              { key: 'plan', label: 'Plan', render: (r) => r.plan.name },
              { key: 'endDate', label: 'Ends', render: (r) => formatDate(r.endDate) },
            ]}
          />
        </section>
        <section>
          <h2 className="mb-2 text-2xl font-semibold">Recent payments</h2>
          <SimpleTable
            empty="No payments recorded yet."
            rows={recentPayments}
            columns={[
              { key: 'user', label: 'Member', render: (r) => r.user.name },
              { key: 'amount', label: 'Amount', render: (r) => money(r.amount) },
              { key: 'method', label: 'Method', render: (r) => label(r.method) },
              { key: 'paidAt', label: 'Date', render: (r) => formatDate(r.paidAt) },
            ]}
          />
        </section>
        <section className="lg:col-span-2">
          <h2 className="mb-2 text-2xl font-semibold">Recent check-ins</h2>
          <SimpleTable
            empty="No check-ins yet."
            rows={recentAttendance}
            columns={[
              { key: 'user', label: 'Member', render: (r) => r.user.name },
              { key: 'checkIn', label: 'Checked in', render: (r) => formatDateTime(r.checkIn) },
              { key: 'checkOut', label: 'Checked out', render: (r) => (r.checkOut ? formatDateTime(r.checkOut) : 'Still in the gym') },
            ]}
          />
        </section>
      </div>
    </div>
  );
}
