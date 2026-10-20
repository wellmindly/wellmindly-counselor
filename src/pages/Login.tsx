import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, apiErrorMessage } from '../api';
import { Lock, Mail, HeartHandshake, AlertCircle, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';

export const Login: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'forgot-password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/counselors/login', { email, password });
      if (res.data.success) {
        login(res.data.data.token, res.data.data.user);
        navigate('/');
      }
    } catch (err: any) {
      setError(apiErrorMessage(err, 'Login failed. Please check credentials.'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotLoading(true);

    try {
      const res = await api.post('/counselors/forgot-password', { email: forgotEmail });
      if (res.data.success) {
        setForgotSubmitted(true);
      }
    } catch (err: any) {
      setForgotError(apiErrorMessage(err, 'Failed to send password reset link. Please check the email entered.'));
    } finally {
      setForgotLoading(false);
    }
  };

  const switchToForgotPassword = () => {
    setForgotEmail(email);
    setForgotError(null);
    setForgotSubmitted(false);
    setMode('forgot-password');
  };

  const switchToLogin = () => {
    setError(null);
    setForgotError(null);
    setForgotSubmitted(false);
    setMode('login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 transition-all">
        {mode === 'login' ? (
          <>
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-indigo-200">
                <HeartHandshake className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Counselor Portal</h1>
              <p className="text-slate-500 text-sm mt-1">Log in to manage your appointments and sessions</p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-700 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="counselor@wellmindly.com"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={switchToForgotPassword}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 text-sm cursor-pointer"
              >
                {loading ? 'Signing in...' : 'Sign In to Portal'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="mb-6">
              <button
                type="button"
                onClick={switchToLogin}
                className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Sign In
              </button>
            </div>

            {forgotSubmitted ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Reset Link Sent</h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  We have sent a password reset link to <strong className="text-slate-800">{forgotEmail}</strong> if it is registered in our system.
                </p>

                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3.5 rounded-xl text-left leading-relaxed">
                  Please check your inbox (and spam/junk folder). The link will expire in <strong>60 minutes</strong>.
                </div>

                <div className="pt-2 flex flex-col space-y-2">
                  <button
                    type="button"
                    onClick={switchToLogin}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-200 transition-all text-sm cursor-pointer"
                  >
                    Return to Sign In
                  </button>
                  <button
                    type="button"
                    onClick={handleForgotSubmit}
                    disabled={forgotLoading}
                    className="w-full py-2 bg-transparent hover:bg-slate-100 text-slate-600 font-medium rounded-xl transition-all text-xs cursor-pointer"
                  >
                    {forgotLoading ? 'Resending...' : 'Didn’t receive it? Click to resend'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Forgot Password</h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Enter your counselor email address to receive a secure password reset link.
                  </p>
                </div>

                {forgotError && (
                  <div className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-700 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Counselor Email</label>
                    <div className="relative">
                      <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="counselor@wellmindly.com"
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 text-sm cursor-pointer"
                  >
                    {forgotLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={switchToLogin}
                      className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      Remember your password? Sign In
                    </button>
                  </div>
                </form>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
