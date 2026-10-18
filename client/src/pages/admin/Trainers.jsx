import CrudPage from '../../components/CrudPage';
import { ActiveBadge } from '../../components/ui';

export default function Trainers() {
  return (
    <CrudPage
      title="Trainers"
      subtitle="Trainer profiles. Assign a trainer to a member from the member's page."
      endpoint="/trainers"
      createLabel="Add trainer"
      searchPlaceholder="Name, email or specialization"
      deleteWarning="Delete this trainer? Members assigned to them will have no trainer."
      columns={[
        { key: 'name', label: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
        { key: 'specialization', label: 'Specialization' },
        { key: 'experienceYears', label: 'Experience', render: (r) => `${r.experienceYears} yr` },
        { key: 'email', label: 'Email' },
        { key: 'members', label: 'Members', render: (r) => r._count.assignments },
        { key: 'isActive', label: 'Status', render: (r) => <ActiveBadge active={r.isActive} /> },
      ]}
      fields={[
        { name: 'name', label: 'Full name', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'phone', label: 'Phone' },
        { name: 'specialization', label: 'Specialization', required: true },
        { name: 'experienceYears', label: 'Years of experience', type: 'number', min: 0, max: 60, omitEmpty: true, default: 0 },
        { name: 'bio', label: 'Bio', type: 'textarea' },
        { name: 'isActive', label: 'Status', type: 'checkbox', checkboxLabel: 'Active', default: true },
      ]}
      filters={[{ name: 'active', label: 'Status', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] }]}
    />
  );
}
