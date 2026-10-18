import { useState } from 'react';
import api, { errorInfo } from '../../api/client';
import { Alert, Button, PageHeader, PageSpinner, Pagination, SimpleTable, StatusBadge } from '../../components/ui';
import useApi from '../../hooks/useApi';
import { formatDate, label, money } from '../../utils/format';

export default function MyMembership() {
  const [page, setPage] = useState(1);
  const memberships = useApi('/me/memberships');
  const plans = useApi('/plans', { pageSize: 50 });
  const payments = useApi('/me/payments', { page, pageSize: 5 });
  const [message, setMessage] = useState(null);
  const [busyPlan, setBusyPlan] = useState(null);

  if (memberships.loading || plans.loading) return <PageSpinner />;
  if (memberships.error || plans.error) return <Alert>{memberships.error || plans.error}</Alert>;

  const hasOpen = memberships.data.data.some((m) => m.status === 'ACTIVE' || m.status === 'PENDING');

  const subscribe = async (plan) => {
    setBusyPlan(plan.id);
    setMessage(null);
    try {
      await api.post('/me/memberships', { planId: plan.id });
      setMessage({ tone: 'success', text: `Request sent for ${plan.name}. Pay at the front desk and it will be activated.` });
      memberships.reload();
    } catch (err) {
      setMessage({ tone: 'error', text: errorInfo(err).message });
    } finally {
      setBusyPlan(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Membership" subtitle="Your plans, available plans and payment history." />
      {message && <Alert tone={message.tone} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <section>
        <h2 className="mb-2 text-2xl font-semibold">Your memberships</h2>
        <SimpleTable
          empty="You have no memberships yet. Pick a plan below."
          rows={memberships.data.data}
          columns={[
            { key: 'plan', label: 'Plan', render: (r) => r.plan.name },
            { key: 'startDate', label: 'Starts', render: (r) => formatDate(r.startDate) },
            { key: 'endDate', label: 'Ends', render: (r) => formatDate(r.endDate) },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-semibold">Available plans</h2>
        {hasOpen && <p className="mb-3 text-sm text-muted">You already have an active or pending membership, so new requests are paused.</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.data.data.map((plan) => (
            <div key={plan.id} className="panel flex flex-col p-5">
              <h3 className="text-3xl font-semibold">{plan.name}</h3>
              <p className="text-sm text-muted">{plan.durationDays} days</p>
              <p className="mt-3 font-display text-4xl font-semibold">{money(plan.price)}</p>
              {plan.description && <p className="mt-2 flex-1 text-sm">{plan.description}</p>}
              <Button className="mt-4" disabled={hasOpen || busyPlan === plan.id} onClick={() => subscribe(plan)}>
                {busyPlan === plan.id ? 'Sending...' : 'Request this plan'}
              </Button>
            </div>
          ))}
          {plans.data.data.length === 0 && <p className="text-sm text-muted">No plans are available right now.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-semibold">Payment history</h2>
        {payments.error && <Alert>{payments.error}</Alert>}
        {payments.data && (
          <>
            <SimpleTable
              empty="No payments recorded yet."
              rows={payments.data.data}
              columns={[
                { key: 'paidAt', label: 'Date', render: (r) => formatDate(r.paidAt) },
                { key: 'amount', label: 'Amount', render: (r) => money(r.amount) },
                { key: 'method', label: 'Method', render: (r) => label(r.method) },
                { key: 'plan', label: 'For', render: (r) => (r.membership ? r.membership.plan.name : '-') },
                { key: 'reference', label: 'Reference', render: (r) => r.reference || '-' },
              ]}
            />
            <Pagination meta={payments.data.meta} onPage={setPage} />
          </>
        )}
      </section>
    </div>
  );
}
