'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isEmbedded: boolean;
  isDemoMode: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/pricing', '/auth/callback'];

// Allowed parent origins for postMessage auth (embedded mode)
const ALLOWED_PARENT_ORIGINS = [
  'https://sealn-super-site.vercel.app',
  'https://bytes-super-site.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

// Demo user for presentation mode
const DEMO_USER = {
  id: 'demo-user-id',
  email: 'demo@madeeasysuite.com',
  app_metadata: {},
  user_metadata: {
    full_name: 'Demo User',
  },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as unknown as User;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Check for demo mode synchronously on initial render to avoid flicker
  const initialDemoMode = typeof window !== 'undefined' && localStorage.getItem('demoSession') === 'true';
  const [user, setUser] = useState<User | null>(initialDemoMode ? DEMO_USER : null);
  const [loading, setLoading] = useState(!initialDemoMode);
  const [isDemoMode, setIsDemoMode] = useState(initialDemoMode);
  const authProcessed = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  // Check if running in embedded mode
  const isEmbedded = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('embedded') === 'true';

  // Authenticate using token from parent
  const authenticateWithToken = useCallback(async (token: string) => {
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: '',
      });

      if (error) {
        console.error('Token auth failed:', error.message);
        return false;
      }

      if (data.user) {
        setUser(data.user);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token auth error:', error);
      return false;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();

      if (error) {
        console.error('Failed to get user:', error.message);
        setUser(null);
      } else {
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle postMessage auth from parent window
  useEffect(() => {
    if (!isEmbedded) return;

    const handleMessage = async (event: MessageEvent) => {
      // Validate origin
      if (!ALLOWED_PARENT_ORIGINS.includes(event.origin)) {
        return;
      }

      // Handle auth token from parent
      if (event.data?.type === 'AUTH_TOKEN' && !authProcessed.current) {
        authProcessed.current = true;
        const success = await authenticateWithToken(event.data.token);
        if (success) {
          // Confirm auth to parent
          window.parent.postMessage({ type: 'AUTH_CONFIRMED' }, event.origin);
          setLoading(false);
        } else {
          await refreshUser();
        }
      }

      // Handle token refresh
      if (event.data?.type === 'AUTH_TOKEN_REFRESH') {
        await authenticateWithToken(event.data.token);
      }
    };

    window.addEventListener('message', handleMessage);

    // Signal to parent that we're ready for auth
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'EMBEDDED_APP_READY' }, '*');
    }

    return () => window.removeEventListener('message', handleMessage);
  }, [isEmbedded, authenticateWithToken, refreshUser]);

  // Handle initial authentication (non-embedded or fallback)
  useEffect(() => {
    const initAuth = async () => {
      // Check for demo session first
      if (typeof window !== 'undefined') {
        const demoSession = localStorage.getItem('demoSession') === 'true';
        if (demoSession) {
          setIsDemoMode(true);
          setUser(DEMO_USER);
          setLoading(false);
          return;
        }
      }

      if (isEmbedded) {
        // In embedded mode, wait for postMessage auth
        // Set a timeout to fall back to session check if no message received
        const timeout = setTimeout(async () => {
          if (!authProcessed.current) {
            await refreshUser();
          }
        }, 3000);
        return () => clearTimeout(timeout);
      } else {
        // Normal session check for standalone mode
        await refreshUser();
      }
    };

    initAuth();

    // Listen for auth state changes (skip if in demo mode)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Don't override demo user with null from Supabase
      const demoSession = localStorage.getItem('demoSession') === 'true';
      if (!demoSession) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isEmbedded, refreshUser]);

  // Redirect to login if not authenticated and on protected route
  // Skip redirect when embedded in another app or in demo mode
  useEffect(() => {
    if (!loading && !user && !PUBLIC_ROUTES.includes(pathname) && !isEmbedded && !isDemoMode) {
      router.push('/login');
    }
  }, [user, loading, pathname, router, isEmbedded, isDemoMode]);

  const logout = async (): Promise<void> => {
    try {
      // Clear demo session
      localStorage.removeItem('demoSession');
      localStorage.removeItem('presentationMode');
      setIsDemoMode(false);

      await supabase.auth.signOut();
      setUser(null);
      if (!isEmbedded) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isEmbedded, isDemoMode, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
