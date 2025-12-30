import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mcsmart.madeeasy.suite',
  appName: 'Made Easy Suite',
  webDir: 'out',
  server: {
    // For development, you can point to your local server
    // url: 'http://localhost:3000',
    // For production, the app loads from the bundled files
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
