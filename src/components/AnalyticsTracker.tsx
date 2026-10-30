import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView, subscribeConsent } from '../lib/analytics';

export function AnalyticsTracker() {
  const location = useLocation();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    const fullPath = location.pathname + location.search;

    if (fullPath !== lastPathRef.current) {
      lastPathRef.current = fullPath;

      const timer = window.setTimeout(() => {
        trackPageView(fullPath, document.title);
      }, 60);

      return () => window.clearTimeout(timer);
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    const unsubscribe = subscribeConsent((record) => {
      if (record && record.categories.analytics && lastPathRef.current) {
        trackPageView(lastPathRef.current, document.title);
      }
    });
    return unsubscribe;
  }, []);

  return null;
}
