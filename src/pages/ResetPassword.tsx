import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../api';
import { Lock, AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, ArrowRight } from 'lucide-react';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');
  const navigate = useNavigate();

  const [verifying, setVerifying] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [counselorEmail, setCounselorEmail] = useState<string>(emailParam || '');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!token) {
      setTokenError('Missing password reset token. Please request a new password reset link.');
      setVerifying(false);
      return;
    }

    api
      .post('/counselors/verify-reset-token', { token, email: emailParam })
      .then((res) => {
        if (res.data.success) {
          if (res.data.data?.email) {
            setCounselorEmail(res.data.data.email);
          }
          setTokenError(null);
        }
      })
      .catch((err) => {
        setTokenError(apiErrorMessage(err, 'This password reset link is invalid or has expired.'));
      })
      .finally(() => {
        setVerifying(false);
      });
  }, [token, emailParam]);

  useEffect(() => {
    if (!submitSuccess) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [submitSuccess, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (password.length < 6) {
      setSubmitError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.post('/counselors/reset-password', {
        token,
        newPassword: password,
        email: counselorEmail || undefined,
      });

      if (res.data.success) {
        setSubmitSuccess(true);
      }
    } catch (err: any) {
      setSubmitError(apiErrorMessage(err, 'Failed to reset password. Please try again or request a new link.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-700 font-medium">Verifying reset password link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 transition-all">
        {tokenError ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Link Invalid or Expired</h2>
            <p className="text-slate-600 text-sm leading-relaxed">{tokenError}</p>

            <div className="pt-4">
              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all text-sm"
              >
                Request a New Reset Link
              </Link>
            </div>
          </div>
        ) : submitSuccess ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Password Reset Successful!</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Your password has been securely updated. You can now log into your counselor account with your new credentials.
            </p>

            <div className="bg-slate-50 border border-slate-200 text-slate-600 text-xs py-2 px-3 rounded-lg">
              Redirecting to sign in in <strong className="text-indigo-600">{countdown}</strong> seconds...
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full inline-flex items-center justify-center py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all text-sm cursor-pointer"
              >
                Sign In Now <ArrowRight className="w-4 h-4 ml-1.5" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-indigo-200">
                <KeyRound className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Create New Password</h1>
              <p className="text-slate-500 text-sm mt-1">
                {counselorEmail ? (
                  <>
                    Resetting password for <strong className="text-slate-700">{counselorEmail}</strong>
                  </>
                ) : (
                  'Choose a strong password for your counselor account'
                )}
              </p>
            </div>

            {submitError && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-700 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 text-sm cursor-pointer"
              >
                {submitting ? 'Updating Password...' : 'Reset Password'}
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                  Remember password? Return to Sign In
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
