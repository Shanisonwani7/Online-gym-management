import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorInfo } from '../../api/client';
import { Alert, Button, DifficultyBadge, PageHeader, PageSpinner, SimpleTable } from '../../components/ui';
import useApi from '../../hooks/useApi';

const num = (v, fallback) => (v === '' || Number.isNaN(Number(v)) ? fallback : Number(v));

export default function WorkoutDetail() {
  const { id } = useParams();
  const { data: plan, loading, error, reload } = useApi(`/workouts/${id}`);
  const exercises = useApi('/exercises', { pageSize: 100 });
  const members = useApi('/members', { active: true, pageSize: 100 });

  const uid = useRef(0);
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState({ exerciseId: '', dayLabel: 'Day 1', sets: 3, reps: 10, restSeconds: 60 });
  const [memberId, setMemberId] = useState('');
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  // Reset the editable rows only when the saved exercises change (not after assigning members).
  const savedKey = plan ? plan.exercises.map((e) => e.id).join(',') : '';
  useEffect(() => {
    if (!plan) return;
    setRows(plan.exercises.map((e) => ({ uid: ++uid.current, exerciseId: e.exerciseId, name: e.exercise.name, muscleGroup: e.exercise.muscleGroup, dayLabel: e.dayLabel, sets: e.sets, reps: e.reps, restSeconds: e.restSeconds })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey, plan && plan.id]);

  if (loading) return <PageSpinner />;
  if (error) return <div className="space-y-3"><Alert>{error}</Alert><Link to="/admin/workouts" className="btn btn-secondary">Back to workout plans</Link></div>;

  const library = (exercises.data && exercises.data.data) || [];
  const assignedIds = new Set(plan.assignments.map((a) => a.userId));
  const candidates = ((members.data && members.data.data) || []).filter((m) => !assignedIds.has(m.id));

  const updateRow = (rowUid, patch) => setRows((rs) => rs.map((r) => (r.uid === rowUid ? { ...r, ...patch } : r)));
  const move = (index, delta) => setRows((rs) => {
    const next = [...rs];
    const target = index + delta;
    if (target < 0 || target >= next.length) return rs;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  const addRow = () => {
    const ex = library.find((e) => String(e.id) === draft.exerciseId);
    if (!ex) { setMessage({ tone: 'error', text: 'Choose an exercise to add' }); return; }
    setRows((rs) => [...rs, { uid: ++uid.current, exerciseId: ex.id, name: ex.name, muscleGroup: ex.muscleGroup, dayLabel: draft.dayLabel.trim() || 'Day 1', sets: num(draft.sets, 3), reps: num(draft.reps, 10), restSeconds: num(draft.restSeconds, 60) }]);
    setDraft((d) => ({ ...d, exerciseId: '' }));
    setMessage(null);
  };

  const savePlan = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.put(`/workouts/${id}`, {
        exercises: rows.map((r) => ({ exerciseId: r.exerciseId, dayLabel: r.dayLabel.trim() || 'Day 1', sets: num(r.sets, 3), reps: num(r.reps, 10), restSeconds: num(r.restSeconds, 60) })),
      });
      setMessage({ tone: 'success', text: 'Workout plan saved' });
      reload();
    } catch (err) {
      setMessage({ tone: 'error', text: errorInfo(err).message });
    } finally {
      setSaving(false);
    }
  };

  const runAssignment = async (fn, okText) => {
    setMessage(null);
    try {
      await fn();
      setMessage({ tone: 'success', text: okText });
      setMemberId('');
      reload();
    } catch (err) {
      setMessage({ tone: 'error', text: errorInfo(err).message });
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title={plan.name} subtitle={[plan.goal, plan.description].filter(Boolean).join('. ') || 'No description yet.'}>
        <DifficultyBadge level={plan.difficulty} />
        <Link to="/admin/workouts" className="btn btn-secondary">Back to workout plans</Link>
      </PageHeader>

      {message && <Alert tone={message.tone} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <section>
        <h2 className="mb-3 text-2xl font-semibold">Exercises in this plan</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Exercise</th><th>Day</th><th>Sets</th><th>Reps</th><th>Rest (sec)</th><th /></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-muted">No exercises yet. Add one below, then save the plan.</td></tr>}
              {rows.map((r, i) => (
                <tr key={r.uid}>
                  <td>
                    <div className="flex gap-1">
                      <Button variant="secondary" size="sm" aria-label={`Move ${r.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>Up</Button>
                      <Button variant="secondary" size="sm" aria-label={`Move ${r.name} down`} disabled={i === rows.length - 1} onClick={() => move(i, 1)}>Down</Button>
                    </div>
                  </td>
                  <td><span className="font-medium">{r.name}</span><br /><span className="text-xs text-muted">{r.muscleGroup}</span></td>
                  <td><input aria-label={`Day for ${r.name}`} className="input w-24" value={r.dayLabel} onChange={(e) => updateRow(r.uid, { dayLabel: e.target.value })} /></td>
                  <td><input aria-label={`Sets for ${r.name}`} type="number" min="1" max="20" className="input w-20" value={r.sets} onChange={(e) => updateRow(r.uid, { sets: e.target.value })} /></td>
                  <td><input aria-label={`Reps for ${r.name}`} type="number" min="1" max="200" className="input w-20" value={r.reps} onChange={(e) => updateRow(r.uid, { reps: e.target.value })} /></td>
                  <td><input aria-label={`Rest seconds for ${r.name}`} type="number" min="0" max="600" className="input w-24" value={r.restSeconds} onChange={(e) => updateRow(r.uid, { restSeconds: e.target.value })} /></td>
                  <td><Button variant="danger" size="sm" onClick={() => setRows((rs) => rs.filter((x) => x.uid !== r.uid))}>Remove</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel mt-3 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
          <div className="lg:col-span-2">
            <label htmlFor="add-ex" className="label">Add exercise</label>
            <select id="add-ex" className="input" value={draft.exerciseId} onChange={(e) => setDraft({ ...draft, exerciseId: e.target.value })}>
              <option value="">Select...</option>
              {library.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.muscleGroup})</option>)}
            </select>
          </div>
          <div><label htmlFor="add-day" className="label">Day</label><input id="add-day" className="input" value={draft.dayLabel} onChange={(e) => setDraft({ ...draft, dayLabel: e.target.value })} /></div>
          <div><label htmlFor="add-sets" className="label">Sets</label><input id="add-sets" type="number" min="1" max="20" className="input" value={draft.sets} onChange={(e) => setDraft({ ...draft, sets: e.target.value })} /></div>
          <div><label htmlFor="add-reps" className="label">Reps</label><input id="add-reps" type="number" min="1" max="200" className="input" value={draft.reps} onChange={(e) => setDraft({ ...draft, reps: e.target.value })} /></div>
          <Button variant="secondary" onClick={addRow}>Add to plan</Button>
        </div>
        <div className="mt-3"><Button onClick={savePlan} disabled={saving}>{saving ? 'Saving...' : 'Save plan'}</Button></div>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-semibold">Assigned members</h2>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="assign-member" className="label">Assign to a member</label>
            <select id="assign-member" className="input" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              <option value="">Select...</option>
              {candidates.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
            </select>
          </div>
          <Button disabled={!memberId} onClick={() => runAssignment(() => api.post(`/workouts/${id}/assign`, { userId: Number(memberId) }), 'Plan assigned')}>Assign</Button>
        </div>
        <SimpleTable
          empty="Not assigned to any member yet."
          rows={plan.assignments}
          columns={[
            { key: 'user', label: 'Member', render: (r) => <Link className="text-plate-blue underline" to={`/admin/members/${r.user.id}`}>{r.user.name}</Link> },
            { key: 'email', label: 'Email', render: (r) => r.user.email },
            { key: 'remove', label: '', render: (r) => <Button variant="danger" size="sm" onClick={() => runAssignment(() => api.delete(`/workouts/${id}/assign/${r.user.id}`), 'Assignment removed')}>Remove</Button> },
          ]}
        />
      </section>
    </div>
  );
}
