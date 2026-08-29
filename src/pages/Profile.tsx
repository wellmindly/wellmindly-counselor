import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, apiErrorMessage } from '../api';
import { User as UserIcon, Save, CheckCircle2, Globe, Phone, Award, Tag, Lock, Mail, ShieldAlert, Upload, Camera } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();

  const [credentials, setCredentials] = useState('');
  const [specializations, setSpecializations] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [timezone, setTimezone] = useState('UTC');

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Account settings states
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setCredentials(profile.credentials || '');
      setSpecializations(Array.isArray(profile.specializations) ? profile.specializations.join(', ') : '');
      setBio(profile.bio || '');
      setPhone(profile.phone || '');
      setAvatarUrl(profile.avatarUrl || '');
      setTimezone(profile.user?.timezone || 'UTC');
    }
    if (user?.email) {
      setEmail(user.email);
    }
  }, [profile, user]);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      try {
        const res = await api.post('/counselors/me/upload', {
          fileName: file.name,
          mimeType: file.type,
          base64Data,
          folder: 'avatars',
        });

        const s3Url = res.data?.data?.url || res.data?.url;
        if (s3Url) {
          setAvatarUrl(s3Url);
          setMessage('Profile image uploaded to AWS S3 successfully!');
        }
      } catch (err: any) {
        console.error('Avatar upload error:', err);
        setMessage(apiErrorMessage(err, 'Failed to upload image to AWS S3.'));
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

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
    } catch (err: any) {
      setMessage(apiErrorMessage(err, 'Failed to update profile.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountSaving(true);
    setAccountMessage(null);
    setAccountError(null);

    if (newPassword && newPassword !== confirmPassword) {
      setAccountError('New passwords do not match.');
      setAccountSaving(false);
      return;
    }

    try {
      const payload: any = {};
      if (email && email.trim().toLowerCase() !== user?.email.toLowerCase()) {
        payload.email = email.trim();
      }
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      if (Object.keys(payload).length === 0) {
        setAccountError('No changes detected in email or password.');
        setAccountSaving(false);
        return;
      }

      const res = await api.put('/counselors/me/account', payload);

      if (res.data.success) {
        setAccountMessage('Account security details updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        refreshProfile();
      }
    } catch (err: any) {
      setAccountError(apiErrorMessage(err, 'Failed to update account details.'));
    } finally {
      setAccountSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
          <UserIcon className="w-7 h-7 text-indigo-600" />
          <span>Counselor Profile & Account Settings</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage your public bio, credentials, specializations, login email, and password preferences.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Clinical Profile Settings */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center space-x-2">
          <Award className="w-5 h-5 text-indigo-600" />
          <span>Clinical & Professional Details</span>
        </h2>

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

          <div className="md:col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <label className="block text-sm font-semibold text-slate-800 mb-2 flex items-center space-x-2">
              <Camera className="w-4 h-4 text-indigo-600" />
              <span>Profile Picture & Avatar</span>
            </label>

            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-5">
              <div className="relative group w-20 h-20 rounded-full border-2 border-indigo-200 overflow-hidden bg-indigo-50 flex items-center justify-center shrink-0 shadow-inner">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Counselor Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-8 h-8 text-indigo-400" />
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                    <span className="text-[10px] text-white font-bold animate-pulse">Uploading...</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <label
                    htmlFor="counselor-avatar-upload"
                    className="cursor-pointer px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingAvatar ? 'Uploading Image...' : 'Upload Photo'}</span>
                  </label>
                  <input
                    id="counselor-avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="px-3 py-2 text-slate-500 hover:text-red-600 font-medium text-xs rounded-xl border border-slate-200 hover:border-red-200 transition-all"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Upload JPG, PNG or WEBP (Max 5MB). Professional high-resolution portrait recommended.
                </p>
                {avatarUrl && (
                  <input
                    type="text"
                    readOnly
                    value={avatarUrl}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 text-[11px] text-slate-500 rounded-lg focus:outline-none"
                  />
                )}
              </div>
            </div>
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

      {/* Account Credentials & Security Settings */}
      <form onSubmit={handleSaveAccount} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center space-x-2">
          <Lock className="w-5 h-5 text-indigo-600" />
          <span>Account & Security Settings</span>
        </h2>

        {accountMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{accountMessage}</span>
          </div>
        )}

        {accountError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{accountError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center space-x-2">
              <Mail className="w-4 h-4 text-indigo-600" />
              <span>Login Email Address</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <p className="text-xs text-slate-400 mt-1">This email is used to log in to the counselor portal.</p>
          </div>

          <div className="md:col-span-2 pt-2 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Change Password (Optional)</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Required if changing password"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={accountSaving}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-slate-200 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            <span>{accountSaving ? 'Updating...' : 'Update Account & Security'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

