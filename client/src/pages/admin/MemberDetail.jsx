import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorInfo } from '../../api/client';
import ProfileForm from '../../components/ProfileForm';
import { ActiveBadge, Alert, Button, DifficultyBadge, PageHeader, PageSpinner, SimpleTable, StatusBadge } from '../../components/ui';
import useApi from '../../hooks/useApi';
import { formatDate } from '../../utils/format';

function TrainerAssign({ member, trainers, onChanged }) {
  const [trainerId, setTrainerId] = useState(member.trainerAssignment ? String(member.trainerAssignment.trainerId) : '');
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.put(`/members/${member.id}/trainer`, { trainerId: trainerId ? Number(trainerId) : null });
      setMessage({ tone: 'success', text: trainerId ? 'Trainer assigned' : 'Trainer removed' });
      onChanged();
    } catch (err) {
      setMessage({ tone: 'error', text: errorInfo(err).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="trainer" className="label">Assigned trainer</label>
          <select id="trainer" className="input" value={trainerId} onChange={(e) => setTrainerId(e.target.value)}>
            <option value="">No trainer</option>
            {trainers.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.specialization})</option>)}
          </select>
        </div>
        <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save trainer'}</Button>
      </div>
    </div>
  );
}

function WorkoutAssign({ member, workouts, onChanged }) {
  const [workoutId, setWorkoutId] = useState('');
  const [message, setMessage] = useState(null);
  const assigned = new Set(member.workoutAssignments.map((a) => a.workoutPlanId));

  const run = async (fn, okText) => {
    setMessage(null);
    try {
      await fn();
      setMessage({ tone: 'success', text: okText });
      onChanged();
    } catch (err) {
      setMessage({ tone: 'error', text: errorInfo(err).message });
    }
  };

  return (
    <div className="space-y-3">
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="workout" className="label">Assign a workout plan</label>
          <select id="workout" className="input" value={workoutId} onChange={(e) => setWorkoutId(e.target.value)}>
            <option value="">Select...</option>
            {workouts.filter((w) => !assigned.has(w.id)).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <Button disabled={!workoutId} onClick={() => run(() => api.post(`/workouts/${workoutId}/assign`, { userId: member.id }).then(() => setWorkoutId('')), 'Workout assigned')}>Assign</Button>
      </div>
      <SimpleTable
        empty="No workout plans assigned."
        rows={member.workoutAssignments.map((a) => ({ id: a.id, ...a.workoutPlan }))}
        columns={[
          { key: 'name', label: 'Plan', render: (r) => <Link className="text-plate-blue underline" to={`/admin/workouts/${r.id}`}>{r.name}</Link> },
          { key: 'difficulty', label: 'Level', render: (r) => <DifficultyBadge level={r.difficulty} /> },
          { key: 'remove', label: '', render: (r) => <Button variant="danger" size="sm" onClick={() => run(() => api.delete(`/workouts/${r.id}/assign/${member.id}`), 'Workout removed')}>Remove</Button> },
        ]}
      />
    </div>
  );
}

export default function MemberDetail() {
  const { id } = useParams();
  const { data: member, loading, error, reload } = useApi(`/members/${id}`);
  const trainers = useApi('/trainers', { active: true, pageSize: 100 });
  const workouts = useApi('/workouts', { pageSize: 100 });

  if (loading) return <PageSpinner />;
  if (error) return <div className="space-y-3"><Alert>{error}</Alert><Link to="/admin/members" className="btn btn-secondary">Back to members</Link></div>;

  return (
    <div className="space-y-8">
      <PageHeader title={member.name} subtitle={`${member.email}${member.phone ? `, ${member.phone}` : ''}. Member since ${formatDate(member.createdAt)}.`}>
        <ActiveBadge active={member.isActive} />
        <Link to="/admin/members" className="btn btn-secondary">Back to members</Link>
      </PageHeader>

      <section>
        <h2 className="mb-3 text-2xl font-semibold">Body information</h2>
        <div className="panel p-5">
          <ProfileForm key={member.id} initial={member.profile || {}} onSave={(payload) => api.put(`/members/${member.id}/profile`, payload)} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-semibold">Trainer</h2>
        <div className="panel p-5">
          <TrainerAssign key={`${member.id}-${member.trainerAssignment ? member.trainerAssignment.trainerId : 0}`} member={member} trainers={(trainers.data && trainers.data.data) || []} onChanged={reload} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-semibold">Workout plans</h2>
        <div className="panel p-5">
          <WorkoutAssign member={member} workouts={(workouts.data && workouts.data.data) || []} onChanged={reload} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-semibold">Memberships</h2>
        <SimpleTable
          empty="No memberships yet."
          rows={member.memberships}
          columns={[
            { key: 'plan', label: 'Plan', render: (r) => r.plan.name },
            { key: 'startDate', label: 'Starts', render: (r) => formatDate(r.startDate) },
            { key: 'endDate', label: 'Ends', render: (r) => formatDate(r.endDate) },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
        <p className="mt-2 text-xs text-muted">Create memberships and record payments from the Memberships and Payments pages.</p>
      </section>
    </div>
  );
}
