import { Link } from 'react-router-dom';
import CrudPage from '../../components/CrudPage';
import { DifficultyBadge } from '../../components/ui';
import { label } from '../../utils/format';

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((d) => ({ value: d, label: label(d) }));

export default function Workouts() {
  return (
    <CrudPage
      title="Workout plans"
      subtitle="Create a plan here, then open it to add exercises and assign it to members."
      endpoint="/workouts"
      createLabel="Add workout plan"
      searchPlaceholder="Name or goal"
      deleteWarning="Delete this workout plan? It will be removed from every member it is assigned to."
      columns={[
        { key: 'name', label: 'Plan', render: (r) => <Link className="font-medium text-plate-blue underline" to={`/admin/workouts/${r.id}`}>{r.name}</Link> },
        { key: 'goal', label: 'Goal', render: (r) => r.goal || '-' },
        { key: 'difficulty', label: 'Level', render: (r) => <DifficultyBadge level={r.difficulty} /> },
        { key: 'exercises', label: 'Exercises', render: (r) => r._count.exercises },
        { key: 'assigned', label: 'Members', render: (r) => r._count.assignments },
      ]}
      fields={[
        { name: 'name', label: 'Plan name', required: true },
        { name: 'goal', label: 'Goal' },
        { name: 'difficulty', label: 'Level', type: 'select', required: true, default: 'BEGINNER', options: LEVELS },
        { name: 'description', label: 'Description', type: 'textarea' },
      ]}
      filters={[{ name: 'difficulty', label: 'Level', options: LEVELS }]}
      rowActions={(row) => <Link to={`/admin/workouts/${row.id}`} className="btn btn-secondary btn-sm">Build plan</Link>}
    />
  );
}
