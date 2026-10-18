import { useState } from 'react';
import api, { errorInfo } from '../../api/client';
import ProfileForm from '../../components/ProfileForm';
import { Alert, Button, Field, PageHeader, PageSpinner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import useApi from '../../hooks/useApi';

function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    if (!form.currentPassword) local.currentPassword = 'Enter your current password';
    if (form.newPassword.length < 8 || !/[A-Za-z]/.test(form.newPassword) || !/[0-9]/.test(form.newPassword)) {
      local.newPassword = 'Use at least 8 characters with a letter and a number';
    }
    if (form.confirm !== form.newPassword) local.confirm = 'Passwords do not match';
    setErrors(local);
    if (Object.keys(local).length) return;

    setSaving(true);
    setMessage(null);
    try {
      await api.put('/auth/password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      setMessage({ tone: 'success', text: 'Password updated' });
    } catch (err) {
      const info = errorInfo(err);
      setErrors(info.fields);
      setMessage({ tone: 'error', text: info.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="max-w-md space-y-4">
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <Field label="Current password" htmlFor="cur-pw" error={errors.currentPassword}>
        <input id="cur-pw" type="password" autoComplete="current-password" className="input" value={form.currentPassword} onChange={set('currentPassword')} />
      </Field>
      <Field label="New password" htmlFor="new-pw" error={errors.newPassword} hint="At least 8 characters, with a letter and a number">
        <input id="new-pw" type="password" autoComplete="new-password" className="input" value={form.newPassword} onChange={set('newPassword')} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm-pw" error={errors.confirm}>
        <input id="confirm-pw" type="password" autoComplete="new-password" className="input" value={form.confirm} onChange={set('confirm')} />
      </Field>
      <Button type="submit" disabled={saving}>{saving ? 'Updating...' : 'Update password'}</Button>
    </form>
  );
}

export default function Profile() {
  const { refreshUser } = useAuth();
  const { data, loading, error } = useApi('/me/profile');

  if (loading) return <PageSpinner />;
  if (error) return <Alert>{error}</Alert>;

  const save = async (payload) => {
    await api.put('/me/profile', payload);
    await refreshUser();
  };

  return (
    <div className="space-y-8">
      <PageHeader title="My profile" subtitle="Keep your details and measurements current so your trainer can plan around them." />
      <section className="panel p-5">
        <ProfileForm initial={data.profile} account={data.user} withAccount onSave={save} />
      </section>
      <section>
        <h2 className="mb-3 text-2xl font-semibold">Change password</h2>
        <div className="panel p-5"><PasswordForm /></div>
      </section>
    </div>
  );
}
