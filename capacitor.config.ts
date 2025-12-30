import type { CapacitorConfig } from '@capacitor/cli';

// Set your deployed URL here (e.g., 'https://made-easy-suite.vercel.app')
const PRODUCTION_URL = process.env.CAPACITOR_SERVER_URL || 'https://made-easy-suite.vercel.app';

const config: CapacitorConfig = {
  appId: 'com.mcsmart.madeeasy.suite',
  appName: 'Made Easy Suite',
  webDir: 'out',
  server: {
    // Point to deployed server (API routes don't work with static export)
    url: PRODUCTION_URL,
    cleartext: false,
    androidScheme: 'https',
  },
  plugins: {
    BackgroundGeolocation: {
      locationAuthorizationRequest: 'Always',
    },
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0f172a',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0f172a',
  },
};

export default config;
