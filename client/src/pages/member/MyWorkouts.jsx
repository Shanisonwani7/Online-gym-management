import { Alert, DifficultyBadge, PageHeader, PageSpinner } from '../../components/ui';
import useApi from '../../hooks/useApi';
import { formatDate } from '../../utils/format';

// Groups a plan's exercises by day label, keeping their order.
function byDay(exercises) {
  const days = [];
  exercises.forEach((e) => {
    let day = days.find((d) => d.label === e.dayLabel);
    if (!day) { day = { label: e.dayLabel, items: [] }; days.push(day); }
    day.items.push(e);
  });
  return days;
}

export default function MyWorkouts() {
  const { data, loading, error } = useApi('/me/workouts');
  if (loading) return <PageSpinner />;
  if (error) return <Alert>{error}</Alert>;

  return (
    <div className="space-y-8">
      <PageHeader title="My workouts" subtitle="Plans your trainer or the front desk assigned to you." />
      {data.data.length === 0 && (
        <div className="panel px-4 py-10 text-center">
          <p className="font-medium">No workout plans yet</p>
          <p className="mt-1 text-sm text-muted">Ask your trainer or the front desk to assign one.</p>
        </div>
      )}
      {data.data.map((plan) => (
        <section key={plan.id} className="panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-3xl font-semibold">{plan.name}</h2>
            <DifficultyBadge level={plan.difficulty} />
          </div>
          <p className="mt-1 text-sm text-muted">{[plan.goal, plan.description].filter(Boolean).join('. ')} Assigned {formatDate(plan.assignedAt)}.</p>
          <div className="mt-4 space-y-4">
            {byDay(plan.exercises).map((day) => (
              <div key={day.label}>
                <h3 className="mb-1 text-xl font-semibold">{day.label}</h3>
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Exercise</th><th>Muscle group</th><th>Sets x reps</th><th>Rest</th></tr></thead>
                    <tbody>
                      {day.items.map((e) => (
                        <tr key={e.id}>
                          <td><span className="font-medium">{e.exercise.name}</span>{e.exercise.equipment && <span className="block text-xs text-muted">{e.exercise.equipment}</span>}</td>
                          <td>{e.exercise.muscleGroup}</td>
                          <td>{e.sets} x {e.reps}</td>
                          <td>{e.restSeconds} sec</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {plan.exercises.length === 0 && <p className="text-sm text-muted">This plan has no exercises yet.</p>}
          </div>
        </section>
      ))}
    </div>
  );
}
