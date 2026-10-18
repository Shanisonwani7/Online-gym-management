import { Link } from 'react-router-dom';
import CrudPage from '../../components/CrudPage';
import { ActiveBadge, StatusBadge } from '../../components/ui';
import { formatDate } from '../../utils/format';

export default function Members() {
  return (
    <CrudPage
      title="Members"
      subtitle="Everyone with a member account. Open a member to manage body information, trainer and workouts."
      endpoint="/members"
      createLabel="Add member"
      searchPlaceholder="Name, email or phone"
      deleteWarning="Delete this member and all of their memberships, payments and attendance? This cannot be undone. To keep the history, edit the member and untick Active instead."
      columns={[
        { key: 'name', label: 'Name', render: (r) => <Link className="font-medium text-plate-blue underline" to={`/admin/members/${r.id}`}>{r.name}</Link> },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone', render: (r) => r.phone || '-' },
        {
          key: 'membership', label: 'Membership',
          render: (r) => {
            const m = r.memberships[0];
            return m ? <span className="inline-flex items-center gap-2"><StatusBadge status={m.status} /><span className="text-xs text-muted">{m.plan.name}, ends {formatDate(m.endDate)}</span></span> : <StatusBadge />;
          },
        },
        { key: 'trainer', label: 'Trainer', render: (r) => (r.trainerAssignment ? r.trainerAssignment.trainer.name : '-') },
        { key: 'isActive', label: 'Account', render: (r) => <ActiveBadge active={r.isActive} /> },
      ]}
      fields={[
        { name: 'name', label: 'Full name', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'phone', label: 'Phone' },
        { name: 'password', label: 'Password', type: 'password', required: true, createOnly: true, hint: 'At least 8 characters, with a letter and a number' },
        { name: 'password', label: 'Reset password (leave blank to keep)', type: 'password', editOnly: true },
        { name: 'isActive', label: 'Account status', type: 'checkbox', checkboxLabel: 'Active (can sign in)', editOnly: true },
      ]}
      filters={[{ name: 'active', label: 'Account', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] }]}
    />
  );
}
