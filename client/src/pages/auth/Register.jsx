import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { errorInfo } from '../../api/client';
import Brand from '../../components/Brand';
import { Alert, Button, Field } from '../../components/ui';
import { homePath, useAuth } from '../../context/AuthContext';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={homePath(user)} replace />;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    if (form.name.trim().length < 2) local.name = 'Name must be at least 2 characters';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) local.email = 'Enter a valid email address';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      local.password = 'Use at least 8 characters with a letter and a number';
    }
    if (form.confirm !== form.password) local.confirm = 'Passwords do not match';
    setErrors(local);
    if (Object.keys(local).length) return;

    setLoading(true);
    setError('');
    try {
      const created = await register({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password });
      navigate(homePath(created), { replace: true });
    } catch (err) {
      const info = errorInfo(err);
      setError(info.message);
      setErrors(info.fields);
    } finally {
      setLoading(false);
    }
  };

  const input = (id, label, props = {}) => (
    <Field label={label} htmlFor={id} error={errors[id]} hint={props.hint}>
      <input id={id} className="input" value={form[id]} onChange={set(id)} aria-invalid={Boolean(errors[id])} {...props} hint={undefined} />
    </Field>
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Brand />
      <div className="panel mt-6 w-full max-w-md p-6">
        <h1 className="text-3xl font-semibold">Create a member account</h1>
        <form onSubmit={submit} noValidate className="mt-4 space-y-4">
          {error && <Alert>{error}</Alert>}
          {input('name', 'Full name', { autoComplete: 'name' })}
          {input('email', 'Email', { type: 'email', autoComplete: 'email' })}
          {input('phone', 'Phone (optional)', { type: 'tel', autoComplete: 'tel' })}
          {input('password', 'Password', { type: 'password', autoComplete: 'new-password', hint: 'At least 8 characters, with a letter and a number' })}
          {input('confirm', 'Confirm password', { type: 'password', autoComplete: 'new-password' })}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</Button>
        </form>
        <p className="mt-4 text-sm text-muted">Already have an account? <Link to="/login" className="font-medium text-plate-blue underline">Sign in</Link></p>
      </div>
    </div>
  );
}
