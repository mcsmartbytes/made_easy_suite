'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';

type IndustrySettings = {
  id: string;
  user_id: string;
  industry_id: string;
  industry_name: string;
  icon: string;
  color: string;
  enabled_modules: string[];
  terminology: Record<string, string>;
  default_settings: Record<string, any>;
  custom_terminology: Record<string, string> | null;
  custom_settings: Record<string, any> | null;
  onboarding_completed: boolean;
};

type IndustryContextType = {
  settings: IndustrySettings | null;
  loading: boolean;
  needsOnboarding: boolean;
  getTerminology: (key: string, fallback?: string) => string;
  isModuleEnabled: (module: string) => boolean;
  getSetting: (key: string, fallback?: any) => any;
  refreshSettings: () => Promise<void>;
};

const IndustryContext = createContext<IndustryContextType | undefined>(undefined);

// Default modules shown when no industry is selected (GC-focused)
const DEFAULT_ENABLED_MODULES = [
  'jobs',
  'estimates',
  'sov',
  'bid_packages',
  'subcontractors',
  'cost_codes',
  'crews',
  'daily_logs',
];

// Modules that require specific industry selection
const INDUSTRY_SPECIFIC_MODULES = ['units', 'tenants', 'leases', 'work_orders', 'rent_roll'];

export function IndustryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<IndustrySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  async function fetchSettings() {
    try {
      const res = await fetch(`/api/user-industry?user_id=${user?.id}`);
      const data = await res.json();

      if (data.success) {
        setSettings(data.data);
        setNeedsOnboarding(data.needs_onboarding || false);
      }
    } catch (err) {
      console.error('Error fetching industry settings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function refreshSettings() {
    await fetchSettings();
  }

  function getTerminology(key: string, fallback?: string): string {
    if (!settings) return fallback || key;

    // Check custom terminology first
    if (settings.custom_terminology && settings.custom_terminology[key]) {
      return settings.custom_terminology[key];
    }

    // Fall back to default terminology
    if (settings.terminology && settings.terminology[key]) {
      return settings.terminology[key];
    }

    return fallback || key;
  }

  function isModuleEnabled(module: string): boolean {
    if (!settings) {
      // No industry selected yet - show GC-focused modules by default
      // Hide industry-specific modules like Property Management features
      if (INDUSTRY_SPECIFIC_MODULES.includes(module)) {
        return false;
      }
      return DEFAULT_ENABLED_MODULES.includes(module) || !INDUSTRY_SPECIFIC_MODULES.includes(module);
    }
    return settings.enabled_modules.includes(module);
  }

  function getSetting(key: string, fallback?: any): any {
    if (!settings) return fallback;

    // Check custom settings first
    if (settings.custom_settings && settings.custom_settings[key] !== undefined) {
      return settings.custom_settings[key];
    }

    // Fall back to default settings
    if (settings.default_settings && settings.default_settings[key] !== undefined) {
      return settings.default_settings[key];
    }

    return fallback;
  }

  return (
    <IndustryContext.Provider
      value={{
        settings,
        loading,
        needsOnboarding,
        getTerminology,
        isModuleEnabled,
        getSetting,
        refreshSettings,
      }}
    >
      {children}
    </IndustryContext.Provider>
  );
}

export function useIndustry() {
  const context = useContext(IndustryContext);
  if (context === undefined) {
    throw new Error('useIndustry must be used within an IndustryProvider');
  }
  return context;
}
