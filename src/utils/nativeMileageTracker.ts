/**
 * Native Mileage Tracker
 * Uses Capacitor Background Geolocation for tracking mileage when the app is in background
 *
 * Note: Background tracking only works in the native iOS/Android app built with Capacitor.
 * The web version falls back to foreground-only tracking.
 */

// Earth radius in miles for distance calculation
const EARTH_RADIUS_MILES = 3958.8;

// Minimum distance between points to count (in miles) - filters GPS noise
const MIN_DISTANCE_THRESHOLD = 0.001;

// Maximum distance between points (in miles) - filters GPS jumps
const MAX_DISTANCE_THRESHOLD = 0.5;

// Speed threshold to detect movement (mph)
const MOVEMENT_SPEED_THRESHOLD = 2;

// Auto-start speed threshold (mph)
const AUTO_START_SPEED_MPH = 5;

// Idle timeout for auto-save (15 minutes in ms)
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

interface MileageTrackerState {
  isTracking: boolean;
  distance: number;
  startLocation: string | null;
  lastPosition: { lat: number; lon: number; timestamp: number } | null;
  lastMovementTime: number;
  startTime: number | null;
}

interface MileageTrackerCallbacks {
  onDistanceUpdate: (distance: number) => void;
  onSpeedUpdate: (speedMph: number) => void;
  onAutoStart: () => void;
  onAutoStop: (tripData: TripData) => void;
  onError: (error: string) => void;
}

export interface TripData {
  distance: number;
  startLocation: string | null;
  endLocation: string | null;
  startTime: Date;
  endTime: Date;
}

// Type for location from the plugin
interface PluginLocation {
  latitude: number;
  longitude: number;
  speed: number | null;
  time: number | null;
  accuracy?: number;
}

// Type for the BackgroundGeolocation plugin
interface BackgroundGeolocationPlugin {
  addWatcher(
    options: {
      backgroundMessage?: string;
      backgroundTitle?: string;
      requestPermissions?: boolean;
      stale?: boolean;
      distanceFilter?: number;
    },
    callback: (location?: PluginLocation, error?: Error) => void
  ): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
}

class NativeMileageTracker {
  private state: MileageTrackerState = {
    isTracking: false,
    distance: 0,
    startLocation: null,
    lastPosition: null,
    lastMovementTime: Date.now(),
    startTime: null,
  };

  private callbacks: MileageTrackerCallbacks | null = null;
  private watcherId: string | null = null;
  private idleCheckInterval: ReturnType<typeof setInterval> | null = null;
  private autoStartEnabled: boolean = true;
  private isNativePlatform: boolean = false;
  private BackgroundGeolocation: BackgroundGeolocationPlugin | null = null;

  /**
   * Check if running in a native Capacitor environment
   */
  isNative(): boolean {
    return this.isNativePlatform;
  }

  /**
   * Initialize the tracker with callbacks
   */
  async initialize(callbacks: MileageTrackerCallbacks): Promise<boolean> {
    this.callbacks = callbacks;

    // Check if we're in a browser environment first
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      // Dynamically import Capacitor to check if we're on a native platform
      const { Capacitor, registerPlugin } = await import('@capacitor/core');
      this.isNativePlatform = Capacitor.isNativePlatform();

      if (!this.isNativePlatform) {
        console.log('Not running in native environment, background tracking unavailable');
        return false;
      }

      // Register and get the BackgroundGeolocation plugin
      // This only works in native Capacitor apps
      this.BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

      if (!this.BackgroundGeolocation) {
        console.log('BackgroundGeolocation plugin not available');
        return false;
      }

      // Start watching for location updates (for speed detection and auto-start)
      await this.startBackgroundWatcher();
      return true;
    } catch (error) {
      console.log('Native tracking not available:', error);
      return false;
    }
  }

  /**
   * Start the background location watcher
   */
  private async startBackgroundWatcher(): Promise<void> {
    if (!this.BackgroundGeolocation) return;

    try {
      this.watcherId = await this.BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: 'Tracking mileage in background',
          backgroundTitle: 'Expenses Made Easy',
          requestPermissions: true,
          stale: false,
          distanceFilter: 10, // Update every 10 meters
        },
        (location, error) => {
          if (error) {
            console.error('Background geolocation error:', error);
            this.callbacks?.onError(error.message);
            return;
          }

          if (location) {
            this.handleLocationUpdate(location);
          }
        }
      );
    } catch (error) {
      console.error('Failed to start background watcher:', error);
      this.callbacks?.onError('Failed to start location tracking');
    }
  }

  /**
   * Handle incoming location updates
   */
  private handleLocationUpdate(location: PluginLocation): void {
    const { latitude, longitude, speed, time } = location;
    const timestamp = time || Date.now();

    // Calculate speed in mph (speed from plugin is in m/s)
    const speedMph = (speed || 0) * 2.237;
    this.callbacks?.onSpeedUpdate(speedMph);

    // Auto-start if moving fast enough and not already tracking
    if (this.autoStartEnabled && !this.state.isTracking && speedMph >= AUTO_START_SPEED_MPH) {
      this.startTracking(latitude, longitude);
      this.callbacks?.onAutoStart();
    }

    // If tracking, accumulate distance
    if (this.state.isTracking && this.state.lastPosition) {
      const distanceMiles = this.calculateDistance(
        this.state.lastPosition.lat,
        this.state.lastPosition.lon,
        latitude,
        longitude
      );

      // Filter out noise and GPS jumps
      if (distanceMiles > MIN_DISTANCE_THRESHOLD && distanceMiles < MAX_DISTANCE_THRESHOLD) {
        this.state.distance += distanceMiles;
        this.callbacks?.onDistanceUpdate(this.state.distance);

        // Update last movement time if actually moving
        if (speedMph >= MOVEMENT_SPEED_THRESHOLD) {
          this.state.lastMovementTime = Date.now();
        }
      }
    }

    // Update last position
    this.state.lastPosition = { lat: latitude, lon: longitude, timestamp };
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (d: number) => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_MILES * c;
  }

  /**
   * Start tracking a trip
   */
  async startTracking(initialLat?: number, initialLon?: number): Promise<void> {
    this.state.isTracking = true;
    this.state.distance = 0;
    this.state.startTime = Date.now();
    this.state.lastMovementTime = Date.now();

    if (initialLat !== undefined && initialLon !== undefined) {
      this.state.lastPosition = { lat: initialLat, lon: initialLon, timestamp: Date.now() };
      this.state.startLocation = await this.reverseGeocode(initialLat, initialLon);
    }

    // Start idle check interval
    this.startIdleCheck();
  }

  /**
   * Stop tracking and return trip data
   */
  async stopTracking(): Promise<TripData | null> {
    if (!this.state.isTracking) return null;

    this.state.isTracking = false;
    this.stopIdleCheck();

    const endLocation = this.state.lastPosition
      ? await this.reverseGeocode(this.state.lastPosition.lat, this.state.lastPosition.lon)
      : null;

    const tripData: TripData = {
      distance: this.state.distance,
      startLocation: this.state.startLocation,
      endLocation,
      startTime: new Date(this.state.startTime || Date.now()),
      endTime: new Date(),
    };

    // Reset state
    this.state.distance = 0;
    this.state.startLocation = null;
    this.state.startTime = null;
    this.autoStartEnabled = true; // Re-enable auto-start for next trip

    return tripData;
  }

  /**
   * Start the idle check interval for auto-save
   */
  private startIdleCheck(): void {
    this.idleCheckInterval = setInterval(async () => {
      const idleMs = Date.now() - this.state.lastMovementTime;

      if (idleMs >= IDLE_TIMEOUT_MS && this.state.isTracking && this.state.distance > 0) {
        console.log('Auto-saving trip after 15 minutes idle');
        const tripData = await this.stopTracking();
        if (tripData) {
          this.callbacks?.onAutoStop(tripData);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop the idle check interval
   */
  private stopIdleCheck(): void {
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  private async reverseGeocode(lat: number, lon: number): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
      );
      const data = await response.json();
      return data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
  }

  /**
   * Get current tracking state
   */
  getState(): MileageTrackerState {
    return { ...this.state };
  }

  /**
   * Disable auto-start (e.g., after manually stopping)
   */
  disableAutoStart(): void {
    this.autoStartEnabled = false;
  }

  /**
   * Enable auto-start
   */
  enableAutoStart(): void {
    this.autoStartEnabled = true;
  }

  /**
   * Cleanup and stop all tracking
   */
  async destroy(): Promise<void> {
    this.stopIdleCheck();

    if (this.watcherId && this.BackgroundGeolocation) {
      try {
        await this.BackgroundGeolocation.removeWatcher({ id: this.watcherId });
      } catch (error) {
        console.error('Error removing watcher:', error);
      }
      this.watcherId = null;
    }
  }
}

// Singleton instance
export const nativeMileageTracker = new NativeMileageTracker();
