/**
 * WellMindly Counselor Platform Analytics & Consent Management
 * 
 * Strict Privacy Guarantees:
 * - Basic GA Consent Mode (no tag loading before explicit consent).
 * - Microsoft Clarity Consent V2.
 * - Route-level exclusions: excludes /students (clinical timelines) and /sessions (teletherapy notes).
 * - Cross-subdomain consent synchronization (.wellmindly.com).
 * - Platform identifier: 'counselor'.
 */

/* ----------------------------------------------------------------------------
   Type Definitions
----------------------------------------------------------------------------- */
export type PlatformId = 'student' | 'counselor' | 'admin' | 'university';
export type Environment = 'development' | 'staging' | 'production';

export interface ConsentCategories {
  strictly_necessary: true;
  analytics: boolean;
  marketing: boolean;
}

export type ConsentDecision = 'accepted_all' | 'rejected_all' | 'customized';

export interface ConsentRecord {
  version: number;
  timestamp: string;
  updatedAt: string;
  decision: ConsentDecision;
  categories: ConsentCategories;
}

export type ConsentListener = (consent: ConsentRecord | null) => void;

export interface AnalyticsConfig {
  platform: PlatformId;
  gaMeasurementId?: string;
  clarityProjectId?: string;
  environment?: Environment;
  cookieDomain?: string;
  debug?: boolean;
}

export interface StandardEventParams {
  platform?: PlatformId;
  environment?: Environment;
  page_group?: string;
  source?: string;
  cta_id?: string;
  cta_location?: string;
  step_name?: string;
  category?: string;
  outcome?: 'started' | 'completed' | 'failed' | 'cancelled' | 'abandoned';
  [key: string]: string | number | boolean | undefined | null;
}

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    clarity?: (...args: any[]) => void;
  }
}

/* ----------------------------------------------------------------------------
   Constants & Taxonomy
----------------------------------------------------------------------------- */
export const CONSENT_VERSION = 1;
export const CONSENT_COOKIE_NAME = 'wm_consent_v1';
export const CONSENT_STORAGE_KEY = 'wellmindly_cookie_consent_v1';
export const CONSENT_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
export const SYNC_CHANNEL_NAME = 'wellmindly_consent_sync';

export const ALLOWED_EVENTS = new Set([
  'page_view',
  'cookie_consent_update',
  'counselor_dashboard_viewed',
  'counselor_availability_updated',
  'navigation_clicked',
  'primary_cta_clicked',
  'login_completed',
  'consent_preferences_updated',
  'app_error_occurred',
]);

const PROHIBITED_KEYS = [
  'password',
  'token',
  'secret',
  'key',
  'auth',
  'jwt',
  'bearer',
  'code',
  'session_id',
  'notes',
  'counseling_notes',
  'transcript',
  'student_name',
  'student_email',
  'phone',
  'diagnosis',
  'clinical_case',
];

const SENSITIVE_QUERY_PARAMS = [
  'token',
  'auth',
  'code',
  'access_token',
  'refresh_token',
  'id_token',
  'state',
  'session_id',
  'key',
  'email',
  'student_id',
  'password',
];

export const EXCLUDED_CLARITY_ROUTES = ['/students', '/sessions'];

/* ----------------------------------------------------------------------------
   Module State
----------------------------------------------------------------------------- */
const listeners: Set<ConsentListener> = new Set();
let broadcastChannel: BroadcastChannel | null = null;
let gaLoaded = false;
let gaScriptAppended = false;
let currentGaId: string | null = null;
let clarityLoaded = false;

const envGaId = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
const envClarityId = import.meta.env.VITE_CLARITY_PROJECT_ID as string | undefined;

let activeConfig: AnalyticsConfig = {
  platform: 'counselor',
  gaMeasurementId: (envGaId || '').trim(),
  clarityProjectId: (envClarityId || '').trim(),
  environment: (import.meta.env.MODE as Environment) || 'development',
  debug: import.meta.env.DEV,
};

if (typeof window !== 'undefined') {
  if ('BroadcastChannel' in window) {
    try {
      broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'CONSENT_UPDATED') {
          notifyListeners(event.data.consent);
        }
      };
    } catch {
      broadcastChannel = null;
    }
  }

  window.addEventListener('storage', (e) => {
    if (e.key === CONSENT_STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue) as ConsentRecord;
        if (isValidConsentRecord(parsed)) {
          notifyListeners(parsed);
        }
      } catch {
        // ignore
      }
    }
  });
}

function notifyListeners(record: ConsentRecord | null): void {
  for (const listener of listeners) {
    try {
      listener(record);
    } catch (err) {
      console.warn('[Analytics:Counselor] Listener error:', err);
    }
  }
}

/* ----------------------------------------------------------------------------
   Cookie & Storage Operations
----------------------------------------------------------------------------- */
export function getRootCookieDomain(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const hostname = window.location.hostname.toLowerCase();
  if (hostname === 'wellmindly.com' || hostname.endsWith('.wellmindly.com')) {
    return '.wellmindly.com';
  }
  return undefined;
}

export function isValidConsentRecord(data: unknown): data is ConsentRecord {
  if (!data || typeof data !== 'object') return false;
  const c = data as Record<string, unknown>;
  if (c.version !== CONSENT_VERSION) return false;
  if (typeof c.timestamp !== 'string' || typeof c.updatedAt !== 'string') return false;
  if (!['accepted_all', 'rejected_all', 'customized'].includes(c.decision as string)) return false;
  if (!c.categories || typeof c.categories !== 'object') return false;

  const cats = c.categories as Record<string, unknown>;
  return (
    cats.strictly_necessary === true &&
    typeof cats.analytics === 'boolean' &&
    typeof cats.marketing === 'boolean'
  );
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function writeCookie(name: string, value: string, maxAgeSeconds: number): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const domain = getRootCookieDomain();
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    let cookieStr = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
    if (domain) cookieStr += `; domain=${domain}`;
    if (isSecure) cookieStr += '; Secure';
    document.cookie = cookieStr;
    return true;
  } catch {
    return false;
  }
}

export function eraseCookie(name: string): void {
  if (typeof document === 'undefined') return;
  const domain = getRootCookieDomain();
  const pastDate = 'Expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';

  document.cookie = `${name}=; ${pastDate}`;
  if (domain) {
    document.cookie = `${name}=; domain=${domain}; ${pastDate}`;
  }
}

export function getConsent(): ConsentRecord | null {
  if (typeof window === 'undefined') return null;

  const cookieVal = readCookie(CONSENT_COOKIE_NAME);
  if (cookieVal) {
    try {
      const parsed = JSON.parse(cookieVal);
      if (isValidConsentRecord(parsed)) {
        const updatedMs = new Date(parsed.updatedAt || parsed.timestamp).getTime();
        if (Date.now() - updatedMs < CONSENT_MAX_AGE_SECONDS * 1000) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (isValidConsentRecord(parsed)) {
        const updatedMs = new Date(parsed.updatedAt || parsed.timestamp).getTime();
        if (Date.now() - updatedMs < CONSENT_MAX_AGE_SECONDS * 1000) {
          writeCookie(CONSENT_COOKIE_NAME, JSON.stringify(parsed), CONSENT_MAX_AGE_SECONDS);
          return parsed;
        }
      }
    }
  } catch {
    // ignore
  }

  return null;
}

export function hasAnalyticsConsent(): boolean {
  const record = getConsent();
  return Boolean(record && record.categories.analytics === true);
}

export function saveConsent(
  decision: ConsentDecision,
  categories: { analytics: boolean; marketing?: boolean }
): ConsentRecord {
  const existing = getConsent();
  const now = new Date().toISOString();

  const record: ConsentRecord = {
    version: CONSENT_VERSION,
    timestamp: existing ? existing.timestamp : now,
    updatedAt: now,
    decision,
    categories: {
      strictly_necessary: true,
      analytics: Boolean(categories.analytics),
      marketing: Boolean(categories.marketing),
    },
  };

  const serialized = JSON.stringify(record);
  writeCookie(CONSENT_COOKIE_NAME, serialized, CONSENT_MAX_AGE_SECONDS);

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, serialized);
  } catch {
    // ignore
  }

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'CONSENT_UPDATED', consent: record });
    } catch {
      // ignore
    }
  }

  notifyListeners(record);
  return record;
}

export function acceptAllConsent(): ConsentRecord {
  return saveConsent('accepted_all', { analytics: true, marketing: true });
}

export function rejectAllConsent(): ConsentRecord {
  return saveConsent('rejected_all', { analytics: false, marketing: false });
}

export function withdrawConsent(): ConsentRecord {
  const record = rejectAllConsent();

  eraseCookie('_ga');
  eraseCookie('_gid');
  eraseCookie('_gat');
  eraseCookie('_clck');
  eraseCookie('_clsk');

  if (typeof document !== 'undefined') {
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const name = cookie.split('=')[0].trim();
        if (name.startsWith('_ga_') || name.startsWith('_cl')) {
          eraseCookie(name);
        }
      }
    } catch {
      // ignore
    }
  }

  return record;
}

export function subscribeConsent(listener: ConsentListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function openConsentPreferences(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wellmindly_open_consent_preferences'));
  }
}

/* ----------------------------------------------------------------------------
   Data Sanitization
----------------------------------------------------------------------------- */
export function sanitizeEventParams(
  params?: Record<string, string | number | boolean | undefined | null>,
  platform?: PlatformId,
  environment?: Environment
): Record<string, string | number | boolean> {
  const clean: Record<string, string | number | boolean> = {};
  if (platform) clean.platform = platform;
  if (environment) clean.environment = environment;
  if (!params) return clean;

  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null) continue;
    const lowerKey = key.toLowerCase();

    const isProhibited = PROHIBITED_KEYS.some((p) => lowerKey.includes(p));
    if (isProhibited) continue;

    if (lowerKey === 'email' && typeof val === 'string') {
      const parts = val.split('@');
      clean[key] = parts.length > 1 ? `...@${parts[1]}` : '[masked]';
      continue;
    }

    if (typeof val === 'number') {
      if (Number.isFinite(val)) clean[key] = val;
      continue;
    }

    if (typeof val === 'boolean') {
      clean[key] = val;
      continue;
    }

    if (typeof val === 'string') {
      clean[key] = val.length > 100 ? val.slice(0, 100) : val;
    }
  }

  return clean;
}

export function sanitizePagePath(fullPath: string): string {
  try {
    const [pathname, search] = fullPath.split('?');
    if (!search) return pathname.startsWith('/') ? pathname : `/${pathname}`;

    const params = new URLSearchParams(search);
    for (const key of SENSITIVE_QUERY_PARAMS) {
      params.delete(key);
    }

    const cleanSearch = params.toString();
    const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
    return cleanSearch ? `${cleanPath}?${cleanSearch}` : cleanPath;
  } catch {
    return fullPath.startsWith('/') ? fullPath : `/${fullPath}`;
  }
}

/* ----------------------------------------------------------------------------
   GA4 & Clarity Adapters
----------------------------------------------------------------------------- */
export function setupGaConsentDefaults(): void {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };
  }

  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500,
  });
}

export function loadGa4(measurementId: string, debug = false): void {
  if (typeof window === 'undefined' || !measurementId) return;
  if (gaLoaded && currentGaId === measurementId) return;

  currentGaId = measurementId;
  setupGaConsentDefaults();

  window.gtag!('consent', 'update', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });

  window.gtag!('js', new Date());

  window.gtag!('config', measurementId, {
    send_page_view: false,
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_flags: 'SameSite=Lax;Secure',
    debug_mode: debug,
  });

  if (!gaScriptAppended) {
    try {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      document.head.appendChild(script);
      gaScriptAppended = true;
      gaLoaded = true;
    } catch (err) {
      console.warn('[Analytics:Counselor] Failed to append gtag script:', err);
    }
  } else {
    gaLoaded = true;
  }
}

export function updateGa4Consent(analyticsGranted: boolean, adsGranted: boolean = false): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('consent', 'update', {
    analytics_storage: analyticsGranted ? 'granted' : 'denied',
    ad_storage: adsGranted ? 'granted' : 'denied',
    ad_user_data: adsGranted ? 'granted' : 'denied',
    ad_personalization: adsGranted ? 'granted' : 'denied',
  });
}

export function isRouteExcludedFromClarity(path: string): boolean {
  const lower = path.toLowerCase();
  return EXCLUDED_CLARITY_ROUTES.some((excluded) => lower.includes(excluded));
}

export function loadClarity(_projectId: string): void {
  // Microsoft Clarity is disabled by default across Counselor platform to protect
  // clinical records, consultation notes, and respect under-18 user restrictions.
  return;
}

export function updateClarityConsent(granted: boolean): void {
  if (typeof window === 'undefined' || !window.clarity) return;
  try {
    window.clarity('consent', granted);
  } catch (err) {
    console.warn('[Analytics:Counselor:Clarity] Failed to update consent:', err);
  }
}

/* ----------------------------------------------------------------------------
   Main Analytics API
----------------------------------------------------------------------------- */
export function initAnalytics(overrideConfig?: Partial<AnalyticsConfig>): void {
  if (typeof window === 'undefined') return;

  if (overrideConfig) {
    activeConfig = { ...activeConfig, ...overrideConfig };
  }

  setupGaConsentDefaults();

  subscribeConsent((record) => {
    const isAnalytics = Boolean(record && record.categories.analytics);
    const isMarketing = Boolean(record && record.categories.marketing);
    updateGa4Consent(isAnalytics, isMarketing);
    updateClarityConsent(isAnalytics);

    if (isAnalytics) {
      if (activeConfig.gaMeasurementId) {
        loadGa4(activeConfig.gaMeasurementId, activeConfig.debug);
      }
      if (activeConfig.clarityProjectId) {
        loadClarity(activeConfig.clarityProjectId);
      }
    }
  });

  if (hasAnalyticsConsent()) {
    const record = getConsent();
    const isMarketing = Boolean(record && record.categories.marketing);
    updateGa4Consent(true, isMarketing);
    if (activeConfig.gaMeasurementId) {
      loadGa4(activeConfig.gaMeasurementId, activeConfig.debug);
    }
    if (activeConfig.clarityProjectId) {
      loadClarity(activeConfig.clarityProjectId);
    }
  }
}

export function trackPageView(path: string, title?: string): void {
  const pageTitle = title || (typeof document !== 'undefined' ? document.title : '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (activeConfig.debug) {
    console.debug(`[Analytics:counselor:PageView] ${cleanPath} ("${pageTitle}")`);
  }

  if (!hasAnalyticsConsent()) return;

  if (window.gtag && gaLoaded) {
    window.gtag('event', 'page_view', {
      page_path: cleanPath,
      page_title: pageTitle.slice(0, 100),
      page_location: `${window.location.origin}${cleanPath}`,
      platform: 'counselor',
      environment: activeConfig.environment || 'development',
    });
  }

  if (window.clarity && clarityLoaded) {
    if (isRouteExcludedFromClarity(cleanPath)) {
      try {
        window.clarity('set', 'sensitive_route', 'true');
      } catch {
        // ignore
      }
    } else {
      try {
        window.clarity('set', 'page', cleanPath);
        window.clarity('set', 'sensitive_route', 'false');
      } catch {
        // ignore
      }
    }
  }
}

export function trackEvent(
  eventName: string,
  params?: StandardEventParams
): void {
  if (activeConfig.debug) {
    console.debug(`[Analytics:counselor:Event] ${eventName}`, params);
  }

  if (activeConfig.debug && !ALLOWED_EVENTS.has(eventName)) {
    console.warn(`[Analytics] Unregistered event name "${eventName}".`);
  }

  if (!hasAnalyticsConsent()) return;

  if (window.gtag && gaLoaded) {
    const cleanParams = sanitizeEventParams(params, 'counselor', activeConfig.environment || 'development');
    window.gtag('event', eventName, cleanParams);
  }

  if (window.clarity && clarityLoaded) {
    try {
      window.clarity('event', eventName);
    } catch {
      // ignore
    }
  }
}
