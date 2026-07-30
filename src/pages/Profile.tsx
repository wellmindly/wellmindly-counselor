import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { User as UserIcon, Save, CheckCircle2, Globe, Phone, Award, Tag } from 'lucide-react';

export const Profile: React.FC = () => {
  const { profile, refreshProfile } = useAuth();

  const [credentials, setCredentials] = useState('');
  const [specializations, setSpecializations] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [timezone, setTimezone] = useState('UTC');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setCredentials(profile.credentials || '');
      setSpecializations(Array.isArray(profile.specializations) ? profile.specializations.join(', ') : '');
      setBio(profile.bio || '');
      setPhone(profile.phone || '');
      setAvatarUrl(profile.avatarUrl || '');
      setTimezone(profile.user?.timezone || 'UTC');
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await api.put('/counselors/me/profile', {
        credentials,
        specializations: specializations.split(',').map((s) => s.trim()),
        bio,
        phone,
        avatarUrl,
        timezone,
      });

      if (res.data.success) {
        setMessage('Profile updated successfully!');
        refreshProfile();
      }
    } catch (err) {
      setMessage('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
          <UserIcon className="w-7 h-7 text-indigo-600" />
          <span>Counselor Profile Settings</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage your public bio, credentials, specializations, and timezone preferences.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center space-x-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <span>Professional Credentials</span>
            </label>
            <input
              type="text"
              required
              value={credentials}
              onChange={(e) => setCredentials(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center space-x-2">
              <Tag className="w-4 h-4 text-indigo-600" />
              <span>Specializations (comma separated)</span>
            </label>
            <input
              type="text"
              value={specializations}
              onChange={(e) => setSpecializations(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center space-x-2">
              <Phone className="w-4 h-4 text-indigo-600" />
              <span>Contact Phone</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center space-x-2">
              <Globe className="w-4 h-4 text-indigo-600" />
              <span>Primary Time Zone</span>
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="UTC">UTC Standard</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Avatar / Profile Picture URL</label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Biography & Clinical Focus</label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Updating...' : 'Save Profile Details'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
