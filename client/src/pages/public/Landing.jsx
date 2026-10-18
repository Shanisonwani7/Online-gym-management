import { Link } from 'react-router-dom';
import Brand from '../../components/Brand';
import { Alert, PageSpinner } from '../../components/ui';
import { homePath, useAuth } from '../../context/AuthContext';
import useApi from '../../hooks/useApi';
import { money } from '../../utils/format';

// Loaded barbell in the weight-plate colour code; it is the one decorative element on the site.
function Barbell() {
  const plates = [
    { w: 22, h: 200, c: '#D2382E' }, { w: 20, h: 188, c: '#1F5FBF' }, { w: 18, h: 168, c: '#E9B20F' },
    { w: 16, h: 146, c: '#2F8F5B' }, { w: 12, h: 120, c: '#F2F4F6' },
  ];
  let x = 150;
  const left = plates.map((p) => { const r = { ...p, x }; x += p.w + 4; return r; });
  return (
    <svg viewBox="0 0 640 220" role="img" aria-label="A barbell loaded with colour-coded weight plates" className="w-full">
      <rect x="20" y="105" width="600" height="10" rx="5" fill="#9AA7B4" />
      {left.map((p) => <rect key={`l${p.c}`} x={p.x} y={110 - p.h / 2} width={p.w} height={p.h} rx="4" fill={p.c} stroke="#0F1822" strokeOpacity="0.35" />)}
      {left.map((p) => <rect key={`r${p.c}`} x={640 - p.x - p.w} y={110 - p.h / 2} width={p.w} height={p.h} rx="4" fill={p.c} stroke="#0F1822" strokeOpacity="0.35" />)}
      <rect x={x + 2} y="92" width="10" height="36" rx="2" fill="#C5CED7" />
      <rect x={640 - x - 12} y="92" width="10" height="36" rx="2" fill="#C5CED7" />
    </svg>
  );
}

const STAFF = [
  'Member records with body information and goals',
  'Membership plans, renewals and expiry tracking',
  'Payment records that activate pending memberships',
  'Trainer profiles and member assignments',
  'Daily check-ins and check-outs',
];
const MEMBERS = [
  'See your plan, days left and payment history',
  'Request a plan online and pay at the front desk',
  'Follow the workout plan your trainer assigns',
  'Check in and out, and review your visits',
  'Keep your own measurements and goals up to date',
];
const DISC = ['bg-plate-green', 'bg-plate-blue', 'bg-plate-yellow', 'bg-plate-red'];

function Plans() {
  const { data, loading, error } = useApi('/plans', { active: true, pageSize: 12 });
  if (loading) return <PageSpinner />;
  if (error) return <Alert>{error}</Alert>;
  if (!data.data.length) return <p className="text-muted">Plans will appear here once the gym publishes them.</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.data.map((plan, i) => (
        <div key={plan.id} className="panel flex flex-col p-5">
          <span aria-hidden="true" className={`mb-3 h-6 w-6 rounded-full ${DISC[i % DISC.length]}`} />
          <h3 className="text-3xl font-semibold">{plan.name}</h3>
          <p className="mt-1 text-sm text-muted">{plan.durationDays} days of full access</p>
          <p className="mt-4 font-display text-4xl font-semibold">{money(plan.price)}</p>
          {plan.description && <p className="mt-2 flex-1 text-sm">{plan.description}</p>}
          <Link to="/register" className="btn btn-primary mt-5">Join with this plan</Link>
        </div>
      ))}
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  return (
    <div>
      <header className="bg-ink">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Brand dark />
          <nav aria-label="Main" className="flex items-center gap-4 text-sm text-white">
            <a href="#plans" className="hidden hover:underline sm:inline">Plans</a>
            {user ? (
              <Link to={homePath(user)} className="btn btn-primary">Open dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="hover:underline">Sign in</Link>
                <Link to="/register" className="btn btn-primary">Join</Link>
              </>
            )}
          </nav>
        </div>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-2 lg:pt-16">
          <div>
            <h1 className="text-5xl font-bold leading-none text-white sm:text-6xl">
              Memberships, payments and training plans in one place
            </h1>
            <p className="mt-5 max-w-prose text-slate-300">
              Ironwork keeps your member list, trainers, attendance and workout plans together, so the front desk and every member are always looking at the same numbers.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="btn btn-primary">Create a member account</Link>
              <Link to="/login" className="btn border border-white/40 text-white hover:bg-white/10">Staff sign in</Link>
            </div>
          </div>
          <Barbell />
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="border-b border-line pb-2 text-3xl font-semibold">For gym staff</h2>
            <ul className="mt-4 space-y-3">{STAFF.map((t) => <li key={t} className="border-b border-line pb-3 text-sm">{t}</li>)}</ul>
          </div>
          <div>
            <h2 className="border-b border-line pb-2 text-3xl font-semibold">For members</h2>
            <ul className="mt-4 space-y-3">{MEMBERS.map((t) => <li key={t} className="border-b border-line pb-3 text-sm">{t}</li>)}</ul>
          </div>
        </section>

        <section id="plans" className="border-t border-line bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-4xl font-semibold">Membership plans</h2>
            <p className="mb-6 mt-2 max-w-prose text-sm text-muted">Create an account, request a plan, and the front desk activates it when your payment is recorded.</p>
            <Plans />
          </div>
        </section>
      </main>

      <footer className="bg-ink py-6 text-center text-sm text-slate-300">Ironwork gym management</footer>
    </div>
  );
}
