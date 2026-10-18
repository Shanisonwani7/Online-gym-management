import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorInfo } from '../../api/client';
import Brand from '../../components/Brand';
import { Alert, Button, Field } from '../../components/ui';
import { homePath, useAuth } from '../../context/AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={homePath(user)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email address';
    if (!password) errors.password = 'Enter your password';
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setLoading(true);
    setError('');
    try {
      const signedIn = await login(email.trim(), password);
      const from = location.state && location.state.from;
      const allowed = from && from.startsWith(homePath(signedIn));
      navigate(allowed ? from : homePath(signedIn), { replace: true });
    } catch (err) {
      setError(errorInfo(err).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Brand />
      <div className="panel mt-6 w-full max-w-sm p-6">
        <h1 className="text-3xl font-semibold">Sign in</h1>
        <form onSubmit={submit} noValidate className="mt-4 space-y-4">
          {error && <Alert>{error}</Alert>}
          <Field label="Email" htmlFor="email" error={fieldErrors.email}>
            <input id="email" type="email" autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(fieldErrors.email)} />
          </Field>
          <Field label="Password" htmlFor="password" error={fieldErrors.password}>
            <input id="password" type="password" autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={Boolean(fieldErrors.password)} />
          </Field>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>
        </form>
        <p className="mt-4 text-sm text-muted">New here? <Link to="/register" className="font-medium text-plate-blue underline">Create a member account</Link></p>
      </div>
    </div>
  );
}
