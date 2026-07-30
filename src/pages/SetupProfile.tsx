import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { HeartHandshake, AlertCircle } from 'lucide-react';

export const SetupProfile: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { login } = useAuth();

  const [inviteData, setInviteData] = useState<{ email: string; firstName: string; lastName: string } | null>(null);
  const [password, setPassword] = useState('');
  const [credentials, setCredentials] = useState('M.Sc. Clinical Psychology, Licensed Counselor');
  const [specializations, setSpecializations] = useState('Anxiety, Depression, Academic Stress');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Missing invitation token link.');
      setLoading(false);
      return;
    }

    api
      .post('/counselors/verify-invite', { token })
      .then((res) => {
        if (res.data.success) {
          setInviteData(res.data.data);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.error?.message || 'Invalid or expired invitation token.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await api.post('/counselors/setup-profile', {
        token,
        password,
        credentials,
        specializations: specializations.split(',').map((s) => s.trim()),
        bio,
        phone,
        timezone,
      });

      if (res.data.success) {
        login(res.data.data.token, res.data.data.user);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Profile setup failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Verifying invitation link...</p>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-lg border border-slate-100">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Invitation Error</h2>
          <p className="text-slate-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-indigo-200">
            <HeartHandshake className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Setup Counselor Profile</h1>
          <p className="text-slate-500 text-sm mt-1">Welcome, {inviteData?.firstName}! Complete your profile setup below.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email (Invited)</label>
            <input
              type="text"
              disabled
              value={inviteData?.email || ''}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Set Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Professional Credentials</label>
            <input
              type="text"
              required
              value={credentials}
              onChange={(e) => setCredentials(e.target.value)}
              placeholder="e.g. Licensed Clinical Social Worker (LCSW)"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Specializations (comma separated)</label>
            <input
              type="text"
              value={specializations}
              onChange={(e) => setSpecializations(e.target.value)}
              placeholder="e.g. Anxiety, Stress Management, CBT"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555-0199"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Time Zone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="UTC">UTC Standard</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bio / Profile Overview</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Brief professional overview visible to students..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all text-sm disabled:opacity-50"
          >
            {submitting ? 'Setting up Profile...' : 'Complete Registration & Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
