import { useState } from 'react';
import { errorInfo } from '../api/client';
import { Alert, Button, Field } from './ui';

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const NUMBER_FIELDS = [
  { name: 'age', label: 'Age', min: 10, max: 100, step: 1 },
  { name: 'heightCm', label: 'Height (cm)', min: 50, max: 260, step: 0.1 },
  { name: 'weightKg', label: 'Weight (kg)', min: 20, max: 400, step: 0.1 },
  { name: 'bodyFatPercent', label: 'Body fat (%)', min: 1, max: 70, step: 0.1 },
];

const toText = (v) => (v === null || v === undefined ? '' : String(v));

// Body information form shared by the member's own profile and the admin's member page.
export default function ProfileForm({ initial, onSave, withAccount = false, account }) {
  const [values, setValues] = useState({
    ...Object.fromEntries(['age', 'heightCm', 'weightKg', 'bodyFatPercent', 'gender', 'goal', 'medicalNotes', 'emergencyContact'].map((k) => [k, toText(initial[k])])),
    name: account ? account.name : '',
    phone: account ? toText(account.phone) : '',
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (name, value) => setValues((v) => ({ ...v, [name]: value }));
  const h = Number(values.heightCm);
  const w = Number(values.weightKg);
  const bmi = h > 0 && w > 0 ? (w / ((h / 100) ** 2)).toFixed(1) : null;

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    for (const f of NUMBER_FIELDS) {
      const v = values[f.name];
      if (v === '') continue;
      if (Number.isNaN(Number(v)) || Number(v) < f.min || Number(v) > f.max) local[f.name] = `Enter a value between ${f.min} and ${f.max}`;
    }
    if (withAccount && values.name.trim().length < 2) local.name = 'Name must be at least 2 characters';
    if (Object.keys(local).length) { setErrors(local); return; }

    const payload = {
      ...Object.fromEntries(NUMBER_FIELDS.map((f) => [f.name, values[f.name] === '' ? null : Number(values[f.name])])),
      gender: values.gender, goal: values.goal, medicalNotes: values.medicalNotes, emergencyContact: values.emergencyContact,
      ...(withAccount ? { name: values.name.trim(), phone: values.phone } : {}),
    };
    setSaving(true);
    setMessage(null);
    setErrors({});
    try {
      await onSave(payload);
      setMessage({ tone: 'success', text: 'Profile saved' });
    } catch (err) {
      const info = errorInfo(err);
      setErrors(info.fields);
      setMessage({ tone: 'error', text: info.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      {withAccount && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="pf-name" error={errors.name}>
            <input id="pf-name" className="input" value={values.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Phone" htmlFor="pf-phone" error={errors.phone}>
            <input id="pf-phone" className="input" value={values.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {NUMBER_FIELDS.map((f) => (
          <Field key={f.name} label={f.label} htmlFor={`pf-${f.name}`} error={errors[f.name]}>
            <input id={`pf-${f.name}`} type="number" className="input" min={f.min} max={f.max} step={f.step} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)} />
          </Field>
        ))}
      </div>
      {bmi && <p className="text-sm text-muted">Body mass index: <strong className="text-ink">{bmi}</strong></p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Gender" htmlFor="pf-gender">
          <select id="pf-gender" className="input" value={values.gender} onChange={(e) => set('gender', e.target.value)}>
            <option value="">Not set</option>
            {GENDERS.map((g) => <option key={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="Goal" htmlFor="pf-goal" error={errors.goal}>
          <input id="pf-goal" className="input" value={values.goal} onChange={(e) => set('goal', e.target.value)} placeholder="For example: build muscle" />
        </Field>
        <Field label="Emergency contact" htmlFor="pf-emergency" error={errors.emergencyContact}>
          <input id="pf-emergency" className="input" value={values.emergencyContact} onChange={(e) => set('emergencyContact', e.target.value)} placeholder="Name and phone" />
        </Field>
        <Field label="Medical notes" htmlFor="pf-medical" error={errors.medicalNotes}>
          <textarea id="pf-medical" rows={2} className="input" value={values.medicalNotes} onChange={(e) => set('medicalNotes', e.target.value)} />
        </Field>
      </div>
      <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</Button>
    </form>
  );
}
