import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, resolveAvatarUrl } from '../api';
import { compressImageForUpload } from '../utils/imageCompressor';
import { HeartHandshake, AlertCircle, Camera, Upload, User as UserIcon } from 'lucide-react';

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
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

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

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError('Image is too large (maximum 15MB). Please select a smaller photo.');
      return;
    }

    setUploadingAvatar(true);
    setError(null);
    setAvatarLoadFailed(false);

    try {
      // Compress and downscale on client before upload to prevent Nginx 413 (Content Too Large)
      const compressed = await compressImageForUpload(file, 800, 0.85);

      const res = await api.post('/counselors/setup-upload', {
        token,
        fileName: compressed.fileName,
        mimeType: compressed.mimeType,
        base64Data: compressed.base64Data,
        folder: 'avatars',
      });

      const s3Url = res.data?.data?.url || res.data?.url;
      if (s3Url) {
        setAvatarUrl(s3Url);
        setAvatarLoadFailed(false);
      }
    } catch (err: any) {
      console.error('Avatar setup upload error:', err);
      setError(err.response?.data?.error?.message || 'Failed to upload image. Please try another photo.');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

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
        avatarUrl: avatarUrl || undefined,
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
            <label className="block text-sm font-semibold text-slate-800 mb-2 flex items-center space-x-2">
              <Camera className="w-4 h-4 text-indigo-600" />
              <span>Profile Picture (Optional)</span>
            </label>

            <div className="flex items-center space-x-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="relative w-16 h-16 rounded-full border-2 border-indigo-200 overflow-hidden bg-indigo-50 flex items-center justify-center shrink-0 shadow-inner">
                {avatarUrl && !avatarLoadFailed ? (
                  <img
                    src={resolveAvatarUrl(avatarUrl)}
                    alt="Counselor Profile"
                    className="w-full h-full object-cover"
                    onError={() => setAvatarLoadFailed(true)}
                  />
                ) : (
                  <UserIcon className="w-7 h-7 text-indigo-400" />
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                    <span className="text-[9px] text-white font-bold animate-pulse">Uploading...</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex items-center space-x-2">
                  <label
                    htmlFor="setup-avatar-upload"
                    className="cursor-pointer px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg shadow-sm transition-all flex items-center space-x-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingAvatar ? 'Uploading...' : 'Upload Photo'}</span>
                  </label>
                  <input
                    id="setup-avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="px-2.5 py-1.5 text-slate-500 hover:text-red-600 font-medium text-xs rounded-lg border border-slate-200 hover:border-red-200 transition-all"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Upload JPG, PNG or WEBP (Max 10MB).
                </p>
              </div>
            </div>
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
