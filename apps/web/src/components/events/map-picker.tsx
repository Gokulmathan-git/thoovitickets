'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Search, X } from 'lucide-react';

interface MapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
  address?: string;
  city?: string;
}

export function MapPicker({ latitude, longitude, onLocationSelect, address, city }: MapPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [tempLat, setTempLat] = useState(latitude || 13.0827);
  const [tempLng, setTempLng] = useState(longitude || 80.2707);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

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
  };

  const confirmLocation = () => {
    onLocationSelect(tempLat, tempLng);
    setIsOpen(false);
  };

  return (
    <div>
      {/* Current Location Display */}
      <div className="flex items-center gap-3">
        <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
          {latitude && longitude ? (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-gray-700">
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

      {/* Map Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h3 className="text-lg font-bold text-gray-900">Pick Event Location</h3>
              <button onClick={() => setIsOpen(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Search */}
            <div className="border-b border-gray-200 p-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    placeholder="Search location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchLocation(searchQuery)}
                    className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </div>
                <Button type="button" size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={() => searchLocation(searchQuery)} disabled={searching}>
                  {searching ? '...' : 'Search'}
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-gray-200">
                  {searchResults.map((result, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectResult(result)}
                      className="flex w-full items-start gap-2 border-b border-gray-100 p-3 text-left text-sm hover:bg-gray-50 last:border-0"
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                      <span className="text-gray-700 line-clamp-2">{result.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Map */}
            <div className="relative h-80">
              <iframe
                title="Pick location"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${tempLng - 0.02},${tempLat - 0.01},${tempLng + 0.02},${tempLat + 0.01}&layer=mapnik&marker=${tempLat},${tempLng}`}
                className="h-full w-full border-0"
              />
              <div className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-700 backdrop-blur-sm shadow">
                📍 {tempLat.toFixed(4)}, {tempLng.toFixed(4)}
              </div>
            </div>

            {/* Adjust coordinates */}
            <div className="border-t border-gray-200 p-4">
              <div className="mb-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={tempLat}
                    onChange={(e) => setTempLat(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={tempLng}
                    onChange={(e) => setTempLng(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="button" className="bg-orange-500 hover:bg-orange-600" onClick={confirmLocation}>
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
