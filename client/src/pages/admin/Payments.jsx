import CrudPage from '../../components/CrudPage';
import { formatDate, label, money } from '../../utils/format';

const METHODS = ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER'].map((m) => ({ value: m, label: label(m) }));

export default function Payments() {
  return (
    <CrudPage
      title="Payments"
      subtitle="Payment records. Linking a payment to a pending membership activates that membership."
      endpoint="/payments"
      createLabel="Record payment"
      searchPlaceholder="Member name, email or reference"
      allowEdit={false}
      deleteWarning="Delete this payment record? Revenue totals will change."
      columns={[
        { key: 'paidAt', label: 'Date', render: (r) => formatDate(r.paidAt) },
        { key: 'user', label: 'Member', render: (r) => r.user.name },
        { key: 'amount', label: 'Amount', render: (r) => <span className="font-medium">{money(r.amount)}</span> },
        { key: 'method', label: 'Method', render: (r) => label(r.method) },
        { key: 'plan', label: 'For', render: (r) => (r.membership ? r.membership.plan.name : '-') },
        { key: 'reference', label: 'Reference', render: (r) => r.reference || '-' },
      ]}
      fields={[
        { name: 'userId', label: 'Member', type: 'select', numeric: true, required: true,
          optionsFrom: { endpoint: '/members', toOption: (m) => ({ value: m.id, label: `${m.name} (${m.email})` }) } },
        { name: 'membershipId', label: 'Membership (optional)', type: 'select', numeric: true, omitEmpty: true,
          optionsFrom: { endpoint: '/memberships', dependsOn: 'userId', params: (userId) => ({ userId }),
            toOption: (m) => ({ value: m.id, label: `${m.plan.name} (${m.status.toLowerCase()}, ends ${formatDate(m.endDate)})` }) } },
        { name: 'amount', label: 'Amount', type: 'number', required: true, min: 0.01, step: '0.01' },
        { name: 'method', label: 'Payment method', type: 'select', required: true, default: 'CASH', options: METHODS },
        { name: 'reference', label: 'Reference or receipt number' },
        { name: 'paidAt', label: 'Payment date', type: 'date', omitEmpty: true, hint: 'Leave blank for today' },
        { name: 'note', label: 'Note', type: 'textarea' },
      ]}
      filters={[
        { name: 'method', label: 'Method', options: METHODS },
        { name: 'from', label: 'From', type: 'date' },
        { name: 'to', label: 'To', type: 'date' },
      ]}
    />
  );
}
