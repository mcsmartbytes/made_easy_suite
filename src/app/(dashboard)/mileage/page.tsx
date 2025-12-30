'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

import { supabase } from '@/utils/supabase';
import { nativeMileageTracker, TripData } from '@/utils/nativeMileageTracker';
import { useUserMode } from '@/contexts/UserModeContext';

interface MileageTrip {
  id: string;
  date: string;
  distance: number;
  start_location: string;
  end_location: string;
  purpose: string;
  is_business: boolean;
  rate: number;
  amount: number;
}

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const MIN_ACCURACY_METERS = 50; // Ignore GPS readings with accuracy worse than 50m
const MIN_SPEED_MPH = 5; // Auto-start threshold

export default function MileagePage() {
  const { isBusiness: defaultIsBusiness } = useUserMode();
  const [trips, setTrips] = useState<MileageTrip[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<MileageTrip[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [startLocation, setStartLocation] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isBusiness, setIsBusiness] = useState(defaultIsBusiness);
  const [rate, setRate] = useState(0.67);
  const [idleTime, setIdleTime] = useState(0); // seconds idle
  const [isNativeMode, setIsNativeMode] = useState(false); // Track if using native Capacitor

  const [typeFilter, setTypeFilter] = useState<'all' | 'business' | 'personal'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'month' | 'quarter' | 'year'>('all');

  // Edit modal state
  const [editingTrip, setEditingTrip] = useState<MileageTrip | null>(null);
  const [editPurpose, setEditPurpose] = useState('');
  const [editIsBusiness, setEditIsBusiness] = useState(true);

  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lon: number; timestamp: number } | null>(null);
  const autoStartTriggered = useRef(false);
  const isTrackingRef = useRef(false);
  const distanceRef = useRef(0); // Track distance in ref for reliable access
  const lastMovementTimeRef = useRef<number>(Date.now());
  const idleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startLocationRef = useRef('');
  const purposeRef = useRef('');
  const isBusinessRef = useRef(true);

  useEffect(() => {
    loadTrips();
    initializeTracking();
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (idleCheckIntervalRef.current) clearInterval(idleCheckIntervalRef.current);
      nativeMileageTracker.destroy();
    };
  }, []);

  // Update isBusiness when mode changes (only when not tracking)
  useEffect(() => {
    if (!isTracking) {
      setIsBusiness(defaultIsBusiness);
    }
  }, [defaultIsBusiness, isTracking]);

  // Initialize tracking - try native first, fall back to web
  async function initializeTracking() {
    // Try to initialize native tracking (Capacitor)
    const nativeInitialized = await nativeMileageTracker.initialize({
      onDistanceUpdate: (dist) => {
        distanceRef.current = dist;
        setDistance(dist);
      },
      onSpeedUpdate: (speed) => {
        setCurrentSpeed(speed);
      },
      onAutoStart: () => {
        setIsTracking(true);
        isTrackingRef.current = true;
        autoStartTriggered.current = true;
        const state = nativeMileageTracker.getState();
        if (state.startLocation) setStartLocation(state.startLocation);
      },
      onAutoStop: async (tripData: TripData) => {
        await saveTrip(tripData, true);
        setIsTracking(false);
        isTrackingRef.current = false;
        setDistance(0);
        distanceRef.current = 0;
      },
      onError: (error) => {
        console.error('Native tracker error:', error);
      },
    });

    if (nativeInitialized) {
      setIsNativeMode(true);
      console.log('Using native background tracking');
    } else {
      // Fall back to web-based tracking
      setIsNativeMode(false);
      console.log('Using web-based tracking (foreground only)');
      startSpeedMonitoring();
    }
  }

  useEffect(() => { applyFilters(); }, [trips, typeFilter, dateFilter]);

  // Idle check interval - runs every 30 seconds when tracking
  useEffect(() => {
    if (isTracking) {
      idleCheckIntervalRef.current = setInterval(() => {
        const idleMs = Date.now() - lastMovementTimeRef.current;
        setIdleTime(Math.floor(idleMs / 1000));

        // Auto-save after 15 minutes of no movement
        if (idleMs >= IDLE_TIMEOUT_MS && isTrackingRef.current && distanceRef.current > 0) {
          console.log('Auto-saving trip after 15 minutes idle');
          handleStopTracking(true); // true = auto-save
        }
      }, 30000); // Check every 30 seconds
    } else {
      if (idleCheckIntervalRef.current) {
        clearInterval(idleCheckIntervalRef.current);
        idleCheckIntervalRef.current = null;
      }
      setIdleTime(0);
    }
    return () => {
      if (idleCheckIntervalRef.current) clearInterval(idleCheckIntervalRef.current);
    };
  }, [isTracking]);

  async function loadTrips() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('mileage').select('*').eq('user_id', user.id).order('date', { ascending: false });
      setTrips(data || []);
    } catch (error) {
      console.error('Error loading trips:', error);
    }
  }

  function applyFilters() {
    let filtered = [...trips];
    if (typeFilter === 'business') filtered = filtered.filter(t => t.is_business);
    else if (typeFilter === 'personal') filtered = filtered.filter(t => !t.is_business);
    const now = new Date();
    if (dateFilter === 'month') { const m = new Date(now.getFullYear(), now.getMonth(), 1); filtered = filtered.filter(t => new Date(t.date) >= m); }
    else if (dateFilter === 'quarter') { const q = Math.floor(now.getMonth() / 3) * 3; const s = new Date(now.getFullYear(), q, 1); filtered = filtered.filter(t => new Date(t.date) >= s); }
    else if (dateFilter === 'year') { const y = new Date(now.getFullYear(), 0, 1); filtered = filtered.filter(t => new Date(t.date) >= y); }
    setFilteredTrips(filtered);
  }

  const totalMiles = filteredTrips.reduce((sum, t) => sum + t.distance, 0);
  const totalAmount = filteredTrips.reduce((sum, t) => sum + t.amount, 0);
  const businessMiles = filteredTrips.filter(t => t.is_business).reduce((sum, t) => sum + t.distance, 0);
  const personalMiles = filteredTrips.filter(t => !t.is_business).reduce((sum, t) => sum + t.distance, 0);
  const taxDeduction = businessMiles * 0.67; // 2024 IRS rate

  function startSpeedMonitoring() {
    if (!navigator.geolocation) { alert('Geolocation is not supported by your browser'); return; }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, accuracy } = position.coords;
        const timestamp = position.timestamp;

        // Calculate speed - use GPS speed if available, otherwise calculate from position change
        let speedMph = 0;
        if (speed !== null && speed >= 0) {
          speedMph = speed * 2.237; // m/s to mph
        } else if (lastPositionRef.current) {
          // Calculate speed from distance/time
          const timeDiff = (timestamp - lastPositionRef.current.timestamp) / 1000; // seconds
          if (timeDiff > 0) {
            const dist = calculateDistance(lastPositionRef.current.lat, lastPositionRef.current.lon, latitude, longitude);
            speedMph = (dist / timeDiff) * 3600; // miles per second to mph
          }
        }

        setCurrentSpeed(speedMph);

        // Skip inaccurate readings
        if (accuracy > MIN_ACCURACY_METERS) {
          console.log(`Skipping inaccurate GPS reading: ${accuracy}m accuracy`);
          return;
        }

        // Auto-start when driving
        if (speedMph >= MIN_SPEED_MPH && !isTrackingRef.current && !autoStartTriggered.current) {
          autoStartTriggered.current = true;
          handleStartTracking(latitude, longitude);
        }

        // Accumulate distance while tracking
        if (isTrackingRef.current && lastPositionRef.current) {
          // Check if this is a new position (not cached)
          if (timestamp > lastPositionRef.current.timestamp) {
            const distanceMiles = calculateDistance(
              lastPositionRef.current.lat,
              lastPositionRef.current.lon,
              latitude,
              longitude
            );

            // Only add distance if it's reasonable (not a GPS jump)
            // Max reasonable distance at highway speed in ~5 seconds is about 0.1 miles
            if (distanceMiles > 0.001 && distanceMiles < 0.5) {
              distanceRef.current += distanceMiles;
              setDistance(distanceRef.current);

              // Update last movement time if actually moving
              if (speedMph >= 2) {
                lastMovementTimeRef.current = Date.now();
              }
            }
          }
        }

        // Always update last position for next calculation
        lastPositionRef.current = { lat: latitude, lon: longitude, timestamp };
      },
      (error) => {
        console.error('Geolocation error:', error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0, // Always get fresh position
        timeout: 10000
      }
    );
  }

  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 3958.8; // Earth radius in miles
    const toRad = (d: number) => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async function handleStartTracking(initialLat?: number, initialLon?: number) {
    setIsTracking(true);
    isTrackingRef.current = true;
    distanceRef.current = 0;
    setDistance(0);
    lastMovementTimeRef.current = Date.now();

    // Use native tracking if available
    if (isNativeMode) {
      await nativeMileageTracker.startTracking(initialLat, initialLon);
      const state = nativeMileageTracker.getState();
      if (state.startLocation) {
        setStartLocation(state.startLocation);
        startLocationRef.current = state.startLocation;
      }
      return;
    }

    // Web-based tracking fallback
    if (initialLat !== undefined && initialLon !== undefined) {
      lastPositionRef.current = { lat: initialLat, lon: initialLon, timestamp: Date.now() };
      const start = await reverseGeocode(initialLat, initialLon);
      setStartLocation(start);
      startLocationRef.current = start;
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        lastPositionRef.current = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          timestamp: pos.timestamp
        };
        const start = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        setStartLocation(start);
        startLocationRef.current = start;
      });
    }
  }

  // Helper to save trip data (used by both web and native tracking)
  async function saveTrip(tripData: TripData, isAutoSave: boolean) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const amount = tripData.distance * rate;
      const tripPurpose = isAutoSave ? (purposeRef.current || 'Auto-saved trip') : (purpose || null);
      const tripIsBusiness = isAutoSave ? isBusinessRef.current : isBusiness;

      await supabase.from('mileage').insert({
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        distance: tripData.distance,
        start_location: tripData.startLocation || null,
        end_location: tripData.endLocation || null,
        purpose: tripPurpose,
        is_business: tripIsBusiness,
        rate,
        amount
      });

      setPurpose('');
      setIsBusiness(true);
      purposeRef.current = '';
      isBusinessRef.current = true;
      loadTrips();

      if (isAutoSave) {
        console.log(`Trip auto-saved: ${tripData.distance.toFixed(2)} miles`);
      }
    } catch (error) {
      console.error('Error saving trip:', error);
    }
  }

  async function handleStopTracking(isAutoSave = false) {
    setIsTracking(false);
    isTrackingRef.current = false;
    autoStartTriggered.current = false; // Allow auto-start for next trip

    // Use native tracking if available
    if (isNativeMode) {
      const tripData = await nativeMileageTracker.stopTracking();
      if (tripData && tripData.distance >= 0.01) {
        await saveTrip(tripData, isAutoSave);
      } else {
        console.log('Trip too short to save');
        setPurpose('');
        setIsBusiness(true);
      }
      distanceRef.current = 0;
      setDistance(0);
      return;
    }

    // Web-based tracking fallback
    const finalDistance = distanceRef.current;

    // Don't save if no distance was recorded
    if (finalDistance < 0.01) {
      console.log('Trip too short to save:', finalDistance);
      distanceRef.current = 0;
      setDistance(0);
      setPurpose('');
      setIsBusiness(true);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let endLocation = '';
      if (lastPositionRef.current) {
        endLocation = await reverseGeocode(lastPositionRef.current.lat, lastPositionRef.current.lon);
      }

      const tripData: TripData = {
        distance: finalDistance,
        startLocation: startLocationRef.current || null,
        endLocation: endLocation || null,
        startTime: new Date(),
        endTime: new Date(),
      };

      await saveTrip(tripData, isAutoSave);

      distanceRef.current = 0;
      setDistance(0);
    } catch (error) {
      console.error('Error saving trip:', error);
    }
  }

  // Keep refs in sync with state for auto-save
  useEffect(() => { purposeRef.current = purpose; }, [purpose]);
  useEffect(() => { isBusinessRef.current = isBusiness; }, [isBusiness]);

  async function reverseGeocode(lat: number, lon: number): Promise<string> {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      const data = await response.json();
      return data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    } catch { return `${lat.toFixed(4)}, ${lon.toFixed(4)}`; }
  }

  async function deleteTrip(id: string) {
    if (!confirm('Delete this trip?')) return;
    const { error } = await supabase.from('mileage').delete().eq('id', id);
    if (!error) loadTrips();
  }

  function openEditModal(trip: MileageTrip) {
    setEditingTrip(trip);
    setEditPurpose(trip.purpose || '');
    setEditIsBusiness(trip.is_business);
  }

  async function handleSaveEdit() {
    if (!editingTrip) return;

    const newAmount = editingTrip.distance * editingTrip.rate;
    const { error } = await supabase
      .from('mileage')
      .update({
        purpose: editPurpose || null,
        is_business: editIsBusiness,
        amount: newAmount
      })
      .eq('id', editingTrip.id);

    if (!error) {
      setEditingTrip(null);
      loadTrips();
    } else {
      console.error('Error updating trip:', error);
      alert('Failed to update trip');
    }
  }

  function exportToCSV() {
    if (filteredTrips.length === 0) { alert('No trips to export'); return; }
    const headers = ['Date', 'Distance (miles)', 'Purpose', 'Type', 'Rate', 'Amount', 'Start Location', 'End Location'];
    const rows = filteredTrips.map(trip => [trip.date, trip.distance.toFixed(2), `"${trip.purpose || 'No purpose'}"`, trip.is_business ? 'Business' : 'Personal', trip.rate.toFixed(2), trip.amount.toFixed(2), `"${trip.start_location || ''}"`, `"${trip.end_location || ''}"`]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })); link.download = `mileage_${new Date().toISOString().split('T')[0]}.csv`; link.click();
  }

  const formatIdleTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Mileage Tracker</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Auto-Tracking</h2>
                {isNativeMode ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    Background Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    Foreground Only
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">Automatically starts when you drive over 5 mph</p>
              <p className="text-xs text-gray-400 mt-1">
                {isNativeMode
                  ? 'Tracks in background - no need to keep app open'
                  : 'Keep app open while driving for tracking'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-600">{currentSpeed.toFixed(1)} mph</p>
              <p className="text-sm text-gray-500">Current Speed</p>
            </div>
          </div>

          {isTracking && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-green-900">Tracking Active</p>
                  <p className="text-green-700 text-2xl font-bold">{distance.toFixed(2)} miles</p>
                  <p className="text-sm text-green-600">From: {startLocation || 'Loading...'}</p>
                  {idleTime > 60 && (
                    <p className="text-xs text-amber-600 mt-1">
                      Idle: {formatIdleTime(idleTime)} (auto-saves at 15:00)
                    </p>
                  )}
                </div>
                <button onClick={() => handleStopTracking(false)} className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">Stop & Save Trip</button>
              </div>

              <div className="mt-4 space-y-2">
                <input type="text" placeholder="Trip purpose (optional - can edit later)" value={purpose} onChange={(e) => setPurpose(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                <label className="flex items-center gap-2"><input type="checkbox" checked={isBusiness} onChange={(e) => setIsBusiness(e.target.checked)} className="w-4 h-4" /><span className="text-sm">Business trip (can change later)</span></label>
              </div>
            </div>
          )}

          {!isTracking && (<button onClick={() => handleStartTracking()} className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">Start Manual Tracking</button>)}
        </div>

        {/* Tax Deduction Summary Banner */}
        {businessMiles > 0 && (
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl p-5 mb-6 text-white shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">💰</span>
                  <h3 className="text-lg font-bold">Tax Deduction Tracker</h3>
                </div>
                <p className="text-emerald-100 text-sm">
                  Your {businessMiles.toFixed(1)} business miles = <span className="font-bold text-white">${taxDeduction.toFixed(2)}</span> in tax deductions at $0.67/mile (2024 IRS rate)
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">${taxDeduction.toFixed(2)}</p>
                <p className="text-xs text-emerald-200 uppercase tracking-wide">Potential Savings</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
              <div className="text-center">
                <p className="text-2xl font-bold">{businessMiles.toFixed(1)}</p>
                <p className="text-xs text-emerald-200">Business Miles</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">$0.67</p>
                <p className="text-xs text-emerald-200">Per Mile Rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{filteredTrips.filter(t => t.is_business).length}</p>
                <p className="text-xs text-emerald-200">Business Trips</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4"><p className="text-sm text-gray-600">Total Miles</p><p className="text-2xl font-bold text-gray-900">{totalMiles.toFixed(1)}</p></div>
          <div className="bg-white rounded-lg shadow p-4"><p className="text-sm text-gray-600">Business Miles</p><p className="text-2xl font-bold text-gray-900">{businessMiles.toFixed(1)}</p></div>
          <div className="bg-white rounded-lg shadow p-4"><p className="text-sm text-gray-600">Personal Miles</p><p className="text-2xl font-bold text-gray-900">{personalMiles.toFixed(1)}</p></div>
          <div className="bg-white rounded-lg shadow p-4"><p className="text-sm text-gray-600">Total Amount</p><p className="text-2xl font-bold text-blue-700">${totalAmount.toFixed(2)}</p></div>
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg shadow p-4 border border-emerald-200">
            <p className="text-sm text-emerald-700 font-medium">Tax Deduction</p>
            <p className="text-2xl font-bold text-emerald-600">${taxDeduction.toFixed(2)}</p>
          </div>
        </div>

        {filteredTrips.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-500">No trips yet</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Date</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Distance (mi)</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Purpose</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Type</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Rate</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Amount</th>
                  <th className="px-4 py-2 text-left text-emerald-700 font-medium">Tax Deduction</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Route</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrips.map((t, idx) => {
                  const tripDeduction = t.is_business ? t.distance * 0.67 : 0;
                  return (
                    <tr key={t.id} className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                      <td className="px-4 py-2">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="px-4 py-2">{t.distance.toFixed(2)}</td>
                      <td className="px-4 py-2">{t.purpose || '—'}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.is_business
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {t.is_business ? 'Business' : 'Personal'}
                        </span>
                      </td>
                      <td className="px-4 py-2">${t.rate.toFixed(2)}</td>
                      <td className="px-4 py-2">${t.amount.toFixed(2)}</td>
                      <td className="px-4 py-2">
                        {t.is_business ? (
                          <span className="font-semibold text-emerald-600">${tripDeduction.toFixed(2)}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500 max-w-[200px] truncate" title={`${t.start_location || 'Unknown'} → ${t.end_location || 'Unknown'}`}>
                        {t.start_location ? `${t.start_location.split(',')[0]}` : '?'} → {t.end_location ? `${t.end_location.split(',')[0]}` : '?'}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(t)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteTrip(t.id)}
                            className="text-red-600 hover:text-red-800 text-xs font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex items-center gap-4">
          <button onClick={exportToCSV} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Export CSV</button>
          <Link href="/expenses/dashboard" className="text-blue-600 hover:text-blue-700 font-semibold">← Back to Dashboard</Link>
        </div>
      </main>

      {/* Edit Trip Modal */}
      {editingTrip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Trip</h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Date</p>
                <p className="font-medium">{new Date(editingTrip.date).toLocaleDateString()}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Distance</p>
                <p className="font-medium">{editingTrip.distance.toFixed(2)} miles</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Route</p>
                <p className="text-sm">{editingTrip.start_location?.split(',')[0] || '?'} → {editingTrip.end_location?.split(',')[0] || '?'}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Purpose</label>
                <input
                  type="text"
                  value={editPurpose}
                  onChange={(e) => setEditPurpose(e.target.value)}
                  placeholder="e.g., Client meeting, Site visit"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editIsBusiness}
                    onChange={(e) => setEditIsBusiness(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Business trip</span>
                </label>
                {editIsBusiness && (
                  <p className="text-xs text-emerald-600 mt-1">
                    Tax deduction: ${(editingTrip.distance * 0.67).toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingTrip(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
