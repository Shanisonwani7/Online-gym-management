import CrudPage from '../../components/CrudPage';
import { DifficultyBadge } from '../../components/ui';
import { label } from '../../utils/format';

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((d) => ({ value: d, label: label(d) }));

export default function Exercises() {
  return (
    <CrudPage
      title="Exercises"
      subtitle="The exercise library used to build workout plans."
      endpoint="/exercises"
      createLabel="Add exercise"
      searchPlaceholder="Name, muscle group or equipment"
      deleteWarning="Delete this exercise? Exercises used in workout plans cannot be deleted."
      columns={[
        { key: 'name', label: 'Exercise', render: (r) => <span className="font-medium">{r.name}</span> },
        { key: 'muscleGroup', label: 'Muscle group' },
        { key: 'equipment', label: 'Equipment', render: (r) => r.equipment || '-' },
        { key: 'difficulty', label: 'Level', render: (r) => <DifficultyBadge level={r.difficulty} /> },
      ]}
      fields={[
        { name: 'name', label: 'Exercise name', required: true },
        { name: 'muscleGroup', label: 'Muscle group', required: true },
        { name: 'equipment', label: 'Equipment' },
        { name: 'difficulty', label: 'Level', type: 'select', required: true, default: 'BEGINNER', options: LEVELS },
        { name: 'description', label: 'How to perform it', type: 'textarea' },
      ]}
      filters={[{ name: 'difficulty', label: 'Level', options: LEVELS }]}
    />
  );
}
