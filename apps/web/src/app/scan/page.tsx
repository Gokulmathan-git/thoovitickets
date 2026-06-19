'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { QrCode, CheckCircle, XCircle, Clock, User, Ticket, Camera, AlertTriangle } from 'lucide-react';

interface Attendee {
  id: string;
  ticketCode: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  ticketType: string;
  status: string;
  checkedInAt: string | null;
}

interface ScanResult {
  ticket: { id: string; ticketCode: string; status: string; attendeeName: string };
  event: { title: string; venue: string; startDate: string; endDate: string };
  order: { orderNumber: string };
  allAttendees: Attendee[];
  eventEnded: boolean;
  canCheckIn: boolean;
}

export default function ScanPage() {
  const { user } = useAuthStore();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInResult, setCheckInResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef<any>(null);

  const isOrganiser = user?.role === 'ORGANISER';

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanner = async () => {
    setScanning(true);
    setError(null);
    setScanResult(null);
    setCheckInResult(null);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await scanner.stop();
          scannerRef.current = null;
          setScanning(false);

          const ticketCode = decodedText.includes('/verify/')
            ? decodedText.split('/verify/').pop() || decodedText
            : decodedText;

          await handleScan(ticketCode);
        },
        () => {},
      );
    } catch (err) {
      setScanning(false);
      setError('Failed to start camera. Please check permissions or enter code manually.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleScan = async (ticketCode: string) => {
    setError(null);
    setScanResult(null);
    setSelectedIds(new Set());
    setCheckInResult(null);

    try {
      const res = await apiClient.post('/mobile/scan', { ticketCode });
      setScanResult(res.data.data);
      const activeIds = new Set<string>();
      res.data.data.allAttendees
        .filter((a: Attendee) => a.status === 'ACTIVE')
        .forEach((a: Attendee) => activeIds.add(a.id));
      setSelectedIds(activeIds);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || 'Invalid ticket or no access');
    }
  };

  const handleManualScan = () => {
    if (!manualCode.trim()) return;
    handleScan(manualCode.trim());
    setManualCode('');
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleCheckIn = async () => {
    if (selectedIds.size === 0) return;
    setCheckingIn(true);
    setCheckInResult(null);
    try {
      const res = await apiClient.post('/mobile/check-in', { ticketIds: Array.from(selectedIds) });
      setCheckInResult(res.data.data);
      if (scanResult) {
        const updatedAttendees = scanResult.allAttendees.map((a) => {
          const result = res.data.data.results.find((r: any) => r.ticketId === a.id);
          if (result && result.status === 'CHECKED_IN') {
            return { ...a, status: 'USED', checkedInAt: result.checkedInAt };
          }
          return a;
        });
        setScanResult({ ...scanResult, allAttendees: updatedAttendees });
        setSelectedIds(new Set());
      }
    } catch {
      setError('Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-900/30">
          <QrCode className="h-7 w-7 text-orange-600" />
        </div>
        <h1 className="mt-3 text-xl font-bold text-gray-900 dark:text-gray-100">Ticket Scanner</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Scan QR codes to check in attendees</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {checkInResult && (
        <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-700 dark:text-green-400">
          <CheckCircle className="inline h-4 w-4 mr-1" />
          {checkInResult.checkedIn} of {checkInResult.total} attendees checked in
        </div>
      )}

      {/* Scanner / Camera */}
      {!scanResult && (
        <Card className="mb-4">
          <CardContent className="p-4">
            {scanning ? (
              <div>
                <div id="qr-reader" className="mb-3 overflow-hidden rounded-lg" />
                <Button onClick={stopScanner} variant="outline" className="w-full">Stop Scanner</Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Button onClick={startScanner} className="w-full bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-5">
                  <Camera className="mr-2 h-5 w-5" /> Open Camera Scanner
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700" /></div>
                  <div className="relative flex justify-center text-xs"><span className="bg-white dark:bg-gray-800 px-3 text-gray-400">or enter code</span></div>
                </div>
                <div className="flex gap-2">
                  <input
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualScan()}
                    placeholder="e.g. TT-GOK170626-A3F7"
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-gray-100 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <Button onClick={handleManualScan} disabled={!manualCode.trim()}>Scan</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scan Result — Attendee List */}
      {scanResult && (
        <div className="space-y-4">
          {/* Event Info */}
          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">{scanResult.event.title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{scanResult.event.venue}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Order: {scanResult.order.orderNumber}
              </p>
              {scanResult.eventEnded && (
                <div className="mt-2 flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" /> Event has ended
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendees */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Attendees ({scanResult.allAttendees.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {scanResult.allAttendees.map((attendee) => {
                  const isUsed = attendee.status === 'USED';
                  const isCancelled = attendee.status === 'CANCELLED';
                  const isActive = attendee.status === 'ACTIVE';
                  const isSelected = selectedIds.has(attendee.id);

                  return (
                    <div
                      key={attendee.id}
                      onClick={() => isActive && !scanResult.eventEnded && toggleSelect(attendee.id)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border p-3 transition-all',
                        isUsed ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' :
                        isCancelled ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 opacity-50' :
                        isSelected ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 cursor-pointer' :
                        'border-gray-200 dark:border-gray-700 cursor-pointer hover:border-orange-300',
                      )}
                    >
                      {/* Checkbox */}
                      <div className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all',
                        isUsed ? 'border-green-500 bg-green-500' :
                        isCancelled ? 'border-red-300 bg-red-100' :
                        isSelected ? 'border-orange-500 bg-orange-500' :
                        'border-gray-300 dark:border-gray-600',
                      )}>
                        {isUsed && <CheckCircle className="h-4 w-4 text-white" />}
                        {isCancelled && <XCircle className="h-4 w-4 text-red-500" />}
                        {isSelected && isActive && <CheckCircle className="h-4 w-4 text-white" />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{attendee.attendeeName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{attendee.ticketType} &middot; {attendee.attendeeEmail}</p>
                      </div>

                      {/* Status */}
                      <div className="shrink-0">
                        {isUsed && (
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">Checked In</span>
                        )}
                        {isCancelled && (
                          <span className="text-xs text-red-500 font-medium">Cancelled</span>
                        )}
                        {isActive && !isSelected && (
                          <span className="text-xs text-gray-400">Pending</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Check-in Button */}
              {!scanResult.eventEnded && scanResult.allAttendees.some((a) => a.status === 'ACTIVE') && (
                <Button
                  onClick={handleCheckIn}
                  disabled={selectedIds.size === 0 || checkingIn}
                  className="w-full mt-4 bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-5"
                >
                  {checkingIn ? 'Checking in...' : `Check In ${selectedIds.size} Attendee${selectedIds.size !== 1 ? 's' : ''}`}
                </Button>
              )}

              {/* Scan Next */}
              <Button
                onClick={() => { setScanResult(null); setCheckInResult(null); setError(null); }}
                variant="outline"
                className="w-full mt-2"
              >
                <QrCode className="mr-2 h-4 w-4" /> Scan Next Ticket
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
