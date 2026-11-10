import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resolveAvatarUrl } from '../api';
import { LayoutDashboard, Calendar, Video, Users, User, LogOut, HeartHandshake, Shield } from 'lucide-react';
import { openConsentPreferences } from '../lib/analytics';

export const Navbar: React.FC = () => {
  const { user, profile, logout } = useAuth();
  const location = useLocation();
  const [imgFailed, setImgFailed] = useState(false);

  const rawAvatarUrl = profile?.avatarUrl || user?.counselorProfile?.avatarUrl;
  const avatarUrl = resolveAvatarUrl(rawAvatarUrl);

  useEffect(() => {
    setImgFailed(false);
  }, [avatarUrl]);

  // shortLabel feeds the phone tab row, where five full labels cannot fit.
  const navItems = [
    { label: 'Dashboard', shortLabel: 'Home', path: '/', icon: LayoutDashboard },
    { label: 'Availability & Calendar', shortLabel: 'Availability', path: '/availability', icon: Calendar },
    { label: 'Sessions', shortLabel: 'Sessions', path: '/sessions', icon: Video },
    { label: 'Student History', shortLabel: 'Students', path: '/students', icon: Users },
    { label: 'My Profile', shortLabel: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">WellMindly</span>
              <span className="block text-xs font-semibold text-indigo-600">Counselor Portal</span>
            </div>
          </Link>

          {/* Nav Items */}
          <nav className="hidden lg:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Profile & Logout & Consent Preferences */}
          <div className="flex items-center space-x-1 sm:space-x-3">
            <Link
              to="/profile"
              className="flex items-center space-x-3 group p-1 rounded-xl hover:bg-slate-50 transition-colors"
            >
              {avatarUrl && !imgFailed ? (
                <img
                  src={avatarUrl}
                  alt={`${user?.firstName} ${user?.lastName}`}
                  className="w-10 h-10 rounded-full object-cover border border-indigo-200 shadow-sm group-hover:ring-2 group-hover:ring-indigo-500 transition-all shrink-0"
                  onError={() => setImgFailed(true)}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-sm shrink-0">
                  {user?.firstName?.[0] || 'C'}{user?.lastName?.[0] || ''}
                </div>
              )}
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                  {user?.firstName} {user?.lastName}
                </p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  ● Active
                </span>
              </div>
            </Link>
            <button
              onClick={openConsentPreferences}
              aria-label="Cookie & Privacy Preferences"
              className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Cookie & Privacy Preferences"
            >
              <Shield className="w-5 h-5" />
            </button>
            <button
              onClick={logout}
              aria-label="Logout"
              className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Phone and tablet navigation. The desktop links above used to be the only
          nav and were `hidden md:flex`: on a phone the only ways off the dashboard
          were its two buttons (Student History had no entry point at all), and at
          768-1023px the five long labels overflowed the header sideways. */}
      <nav className="lg:hidden border-t border-slate-100 grid grid-cols-5" aria-label="Primary">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center min-h-14 py-1.5 text-[11px] font-medium transition-colors ${
                isActive ? 'text-indigo-700 font-semibold bg-indigo-50' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="truncate max-w-full px-0.5">{item.shortLabel}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
};
