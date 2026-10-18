import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Brand from './Brand';

export default function DashboardLayout({ nav, area }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen md:flex">
      <header className="flex items-center justify-between bg-ink px-4 py-3 md:hidden">
        <Brand to={nav[0].to} dark />
        <button
          type="button"
          className="rounded border border-white/30 px-3 py-1 text-sm text-white"
          aria-expanded={open}
          aria-controls="sidebar"
          onClick={() => setOpen((o) => !o)}
        >
          Menu
        </button>
      </header>

      <aside id="sidebar" className={`${open ? 'block' : 'hidden'} shrink-0 bg-ink text-white md:sticky md:top-0 md:block md:h-screen md:w-60 md:overflow-y-auto`}>
        <div className="hidden px-5 py-5 md:block"><Brand to={nav[0].to} dark /></div>
        <p className="px-5 pb-2 pt-3 text-sm text-slate-300 md:pt-0">{area}</p>
        <nav aria-label={`${area} navigation`} className="px-2 pb-4">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block rounded-md border-l-4 px-3 py-2 text-sm ${isActive ? 'border-plate-blue bg-white/10 text-white' : 'border-transparent text-slate-300 hover:bg-white/5 hover:text-white'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-sm">
          <p className="truncate font-medium">{user.name}</p>
          <p className="truncate text-xs text-slate-300">{user.email}</p>
          <button type="button" onClick={logout} className="mt-3 rounded border border-white/30 px-3 py-1 text-xs hover:bg-white/10">Sign out</button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8"><Outlet /></div>
      </main>
    </div>
  );
}
