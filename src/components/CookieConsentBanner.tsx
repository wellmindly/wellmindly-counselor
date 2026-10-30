import { useState, useEffect, useRef } from 'react';
import { Shield, Cookie, X, SlidersHorizontal, ExternalLink } from 'lucide-react';
import {
  getConsent,
  saveConsent,
  acceptAllConsent,
  rejectAllConsent,
  type ConsentRecord,
} from '../lib/analytics';

export function CookieConsentBanner() {
  const [, setConsent] = useState<ConsentRecord | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const existing = getConsent();
    if (existing) {
      setConsent(existing);
      setAnalyticsEnabled(existing.categories.analytics);
      setShowBanner(false);
    } else {
      setShowBanner(true);
    }

    const handleOpenPreferences = () => {
      const current = getConsent();
      if (current) {
        setAnalyticsEnabled(current.categories.analytics);
      } else {
        setAnalyticsEnabled(false);
      }
      setShowModal(true);
    };

    window.addEventListener('wellmindly_open_consent_preferences', handleOpenPreferences);
    return () => {
      window.removeEventListener('wellmindly_open_consent_preferences', handleOpenPreferences);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false);
        triggerRef.current?.focus();
      }
    };

    if (showModal) {
      window.addEventListener('keydown', handleKeyDown);
      modalRef.current?.focus();
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showModal]);

  const handleAcceptAll = () => {
    const rec = acceptAllConsent();
    setConsent(rec);
    setShowBanner(false);
    setShowModal(false);
  };

  const handleRejectAll = () => {
    const rec = rejectAllConsent();
    setConsent(rec);
    setShowBanner(false);
    setShowModal(false);
  };

  const handleSavePreferences = () => {
    const rec = saveConsent('customized', {
      analytics: analyticsEnabled,
      marketing: false,
    });
    setConsent(rec);
    setShowBanner(false);
    setShowModal(false);
  };

  return (
    <>
      {showBanner && !showModal && (
        <aside
          role="region"
          aria-label="Cookie and Privacy Consent"
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-4xl"
        >
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-2xl backdrop-blur-md sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Cookie className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Counselor Portal &bull; Privacy & Telemetry
                  </h2>
                  <p className="text-xs leading-relaxed text-slate-600 max-w-2xl">
                    WellMindly uses strictly necessary cookies for secure clinical authentication. With your permission, aggregate telemetry helps us improve portal stability and schedule workflows. We never record student clinical timelines or consultation notes.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 sm:shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Customize
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleRejectAll}
                  className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 cursor-pointer"
                >
                  Reject Optional
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 cursor-pointer"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="counselor-cookie-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <div
            ref={modalRef}
            tabIndex={-1}
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl focus:outline-none"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <Shield className="h-5 w-5 text-indigo-600" />
                <h3 id="counselor-cookie-modal-title" className="text-base font-bold text-slate-900">
                  Counselor Portal Privacy Choices
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Close preferences"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">Strictly Necessary Cookies</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-2xs font-bold text-emerald-800">
                    Always Active
                  </span>
                </div>
                <p className="mt-1 text-slate-600">
                  Required for clinical credentials, authenticated JWT persistence, and route protection.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900">Analytics (GA4 & Clarity)</span>
                    <p className="mt-0.5 text-slate-600">
                      Anonymous aggregate metrics for dashboard navigation and calendar availability workflows.
                    </p>
                  </div>
                  <label className="relative ml-4 inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={analyticsEnabled}
                      onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                      className="sr-only peer"
                      aria-label="Enable analytics cookies"
                    />
                    <div className="w-10 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                <div className="mt-2 text-2xs text-slate-500 border-t border-slate-200/60 pt-2">
                  ✓ Clinical notes masked &bull; ✓ Student history excluded from session recordings
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <a
                href="https://wellmindly.com/privacy"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-2xs font-medium text-indigo-600 hover:underline"
              >
                Privacy Notice <ExternalLink className="h-3 w-3" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRejectAll}
                  className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                >
                  Reject Optional
                </button>
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 cursor-pointer"
                >
                  Save Choices
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
