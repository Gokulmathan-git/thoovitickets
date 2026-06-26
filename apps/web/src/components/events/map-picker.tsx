'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { MapPin, Search, X, Navigation } from 'lucide-react';

interface MapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
  address?: string;
  city?: string;
}

const DEFAULT_CENTER = { lat: 13.0827, lng: 80.2707 };

export function MapPicker({ latitude, longitude, onLocationSelect, address, city }: MapPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [tempLat, setTempLat] = useState(latitude || DEFAULT_CENTER.lat);
  const [tempLng, setTempLng] = useState(longitude || DEFAULT_CENTER.lng);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (latitude && longitude) {
        setTempLat(latitude);
        setTempLng(longitude);
      }
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen, latitude, longitude]);

  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        { headers: { 'Accept-Language': 'en' } },
      );
      const data = await res.json();
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const autoGeocode = useCallback(async () => {
    const query = [address, city].filter(Boolean).join(', ');
    if (!query) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } },
      );
      const data = await res.json();
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setTempLat(lat);
        setTempLng(lng);
        mapRef.current?.panTo({ lat, lng });
        onLocationSelect(lat, lng);
      }
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }, [address, city, onLocationSelect]);

  const selectResult = (result: { lat: string; lon: string }) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setTempLat(lat);
    setTempLng(lng);
    setSearchResults([]);
    setSearchQuery('');
    mapRef.current?.panTo({ lat, lng });
  };

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setTempLat(e.latLng.lat());
      setTempLng(e.latLng.lng());
    }
  }, []);

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setTempLat(lat);
        setTempLng(lng);
        mapRef.current?.panTo({ lat, lng });
      },
      () => {},
      { enableHighAccuracy: true },
    );
  };

  const confirmLocation = () => {
    onLocationSelect(tempLat, tempLng);
    setIsOpen(false);
  };

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2.5">
          {latitude && longitude ? (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">No location set</span>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(true)} className="shrink-0">
          <MapPin className="mr-1 h-4 w-4" /> Pick Location
        </Button>
        {!latitude && city && (
          <Button type="button" variant="outline" size="sm" onClick={autoGeocode} disabled={searching} className="shrink-0">
            {searching ? '...' : 'Auto-detect'}
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Pick Event Location</h3>
              <button onClick={() => setIsOpen(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    placeholder="Search location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchLocation(searchQuery)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:text-gray-100"
                  />
                </div>
                <Button type="button" size="sm" className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white" onClick={() => searchLocation(searchQuery)} disabled={searching}>
                  {searching ? '...' : 'Search'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleCurrentLocation} title="Use current location">
                  <Navigation className="h-4 w-4" />
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  {searchResults.map((result, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectResult(result)}
                      className="flex w-full items-start gap-2 border-b border-gray-100 dark:border-gray-700 p-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-900 last:border-0"
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                      <span className="text-gray-700 dark:text-gray-300 line-clamp-2">{result.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative h-80">
              {isLoaded ? (
                <GoogleMap
                  mapContainerClassName="h-full w-full"
                  center={{ lat: tempLat, lng: tempLng }}
                  zoom={15}
                  onClick={handleMapClick}
                  onLoad={onMapLoad}
                  options={{
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                  }}
                >
                  <Marker position={{ lat: tempLat, lng: tempLng }} />
                </GoogleMap>
              ) : (
                <div className="flex h-full items-center justify-center bg-gray-100 dark:bg-gray-900">
                  <p className="text-sm text-gray-500">Loading map...</p>
                </div>
              )}
              <div className="absolute bottom-3 left-3 rounded-lg bg-white/90 dark:bg-gray-800/90 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 backdrop-blur-sm shadow">
                {tempLat.toFixed(4)}, {tempLng.toFixed(4)}
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">Click on the map to pin your event location</p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="button" className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white" onClick={confirmLocation}>
                  Confirm Location
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
