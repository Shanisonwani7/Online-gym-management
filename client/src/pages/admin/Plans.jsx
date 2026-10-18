import CrudPage from '../../components/CrudPage';
import { ActiveBadge } from '../../components/ui';
import { money } from '../../utils/format';

export default function Plans() {
  return (
    <CrudPage
      title="Plans"
      subtitle="Membership plans shown on the public site. Deactivate a plan to stop new sign-ups without losing its history."
      endpoint="/plans"
      createLabel="Add plan"
      deleteWarning="Delete this plan? Plans that already have memberships cannot be deleted; deactivate them instead."
      columns={[
        { key: 'name', label: 'Plan', render: (r) => <span className="font-medium">{r.name}</span> },
        { key: 'durationDays', label: 'Duration', render: (r) => `${r.durationDays} days` },
        { key: 'price', label: 'Price', render: (r) => money(r.price) },
        { key: 'memberships', label: 'Memberships', render: (r) => r._count.memberships },
        { key: 'isActive', label: 'Status', render: (r) => <ActiveBadge active={r.isActive} /> },
      ]}
      fields={[
        { name: 'name', label: 'Plan name', required: true },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'durationDays', label: 'Duration (days)', type: 'number', required: true, min: 1, max: 3650 },
        { name: 'price', label: 'Price', type: 'number', required: true, min: 0, step: '0.01' },
        { name: 'isActive', label: 'Status', type: 'checkbox', checkboxLabel: 'Active (visible for sign-up)', default: true },
      ]}
      filters={[{ name: 'active', label: 'Status', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] }]}
    />
  );
}
