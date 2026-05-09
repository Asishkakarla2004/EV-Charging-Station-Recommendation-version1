import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const AppShell = ({ badge, title, subtitle, navItems, children, activeKey, onTabChange }) => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="min-h-screen px-4 py-4 md:px-6">
      <div className="grid min-h-[calc(100vh-2rem)] grid-cols-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="app-panel flex flex-col justify-between p-6">
          <div>
            <div className="mb-10">
              <p className="text-xs uppercase tracking-[0.26em] text-gray-500 dark:text-gray-400">{badge}</p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="app-panel-muted mb-6 block w-full cursor-pointer p-4 text-left transition hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Signed In</p>
                  <p className="mt-2 text-sm font-medium">{user?.email ?? 'Guest session'}</p>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Click to open profile panel</p>
                </div>
                <span className="mt-1 text-lg text-gray-400 dark:text-gray-500">›</span>
              </div>
            </button>
            <nav className="space-y-2">
              {navItems.map((item) =>
                item.to ? (
                  <NavLink
                    key={item.key}
                    to={item.to}
                    className={({ isActive }) =>
                      `block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                        isActive
                          ? 'bg-black text-white dark:bg-white dark:text-black'
                          : 'text-gray-700 hover:bg-black/[0.04] dark:text-gray-200 dark:hover:bg-white/[0.06]'
                      }`
                    }
                  >
                    <span className="block">{item.label}</span>
                    {item.description ? (
                      <span className="mt-1 block text-xs opacity-70">{item.description}</span>
                    ) : null}
                  </NavLink>
                ) : (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onTabChange?.(item.key)}
                    className={`block w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                      activeKey === item.key
                        ? 'bg-black text-white dark:bg-white dark:text-black'
                        : 'text-gray-700 hover:bg-black/[0.04] dark:text-gray-200 dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="block">{item.label}</span>
                    {item.description ? (
                      <span className="mt-1 block text-xs opacity-70">{item.description}</span>
                    ) : null}
                  </button>
                )
              )}
            </nav>
          </div>

          <div />
        </aside>

        <main className="app-panel overflow-hidden p-4 md:p-6">
          {children}
        </main>
      </div>

      <div
        className={`fixed inset-0 z-[120] transition ${
          isProfileOpen ? 'pointer-events-auto bg-black/35 opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setIsProfileOpen(false)}
      />
      <aside
        className={`fixed right-0 top-0 z-[130] h-full w-full max-w-sm border-l bg-white/95 p-6 shadow-2xl backdrop-blur-xl transition-transform dark:bg-[#0f0f10]/95 ${
          isProfileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Account</p>
            <h2 className="mt-3 text-2xl font-semibold">Profile Overview</h2>
          </div>
          <button
            type="button"
            onClick={() => setIsProfileOpen(false)}
            className="app-button-secondary px-3 py-2"
          >
            Close
          </button>
        </div>

        <div className="mt-8 space-y-4">
          <div className="app-panel-muted p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Name</p>
            <p className="mt-2 text-lg font-semibold">{user?.name ?? 'Guest User'}</p>
          </div>
          <div className="app-panel-muted p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Email</p>
            <p className="mt-2 text-lg font-semibold break-words">{user?.email ?? 'Not signed in'}</p>
          </div>
          <div className="app-panel-muted p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Role</p>
            <p className="mt-2 text-lg font-semibold">{user?.role ? user.role.replace('_', ' ') : 'Guest'}</p>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button type="button" onClick={toggleTheme} className="app-button-secondary flex-1">
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button type="button" onClick={handleLogout} className="app-button-primary flex-1">
            Logout
          </button>
        </div>
      </aside>
    </div>
  );
};

export default AppShell;
