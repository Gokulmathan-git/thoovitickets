'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, Calendar, MapPin, Loader2, UserCheck } from 'lucide-react';

interface TicketVerifyInfo {
  id: string;
  ticketCode: string;
  status: string;
  attendeeName: string;
  attendeeEmail: string;
  checkedInAt: string | null;
  orderItem: {
    ticketType: { name: string };
    event: { id: string; title: string; venue: string; startDate: string; endDate: string; organiserId: string };
  };
  order: { orderNumber: string; status: string };
}

export default function VerifyTicketPage() {
  const params = useParams();
  const { user } = useAuthStore();
  const [ticket, setTicket] = useState<TicketVerifyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const code = params.code as string;

  useEffect(() => {
    apiClient
      .get(`/tickets/verify/${code}`)
      .then((res) => setTicket(res.data.data))
      .catch(() => setError('Ticket not found or invalid code'))
      .finally(() => setLoading(false));
  }, [code]);

  const handleCheckIn = async () => {
    if (!ticket) return;
    setCheckingIn(true);
    try {
      await apiClient.post(`/tickets/${ticket.ticketCode}/check-in`);
      setTicket({ ...ticket, status: 'USED', checkedInAt: new Date().toISOString() });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="mx-auto w-full max-w-md">
          <CardContent className="py-12 text-center">
            <XCircle className="mx-auto h-16 w-16 text-red-500" />
            <h1 className="mt-4 text-xl font-bold text-gray-900">Invalid Ticket</h1>
            <p className="mt-2 text-sm text-gray-500">{error || 'This ticket could not be found.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOrganiser = user?.role === 'ORGANISER' && user?.id === ticket.orderItem.event.organiserId;
  const isActive = ticket.status === 'ACTIVE';
  const isUsed = ticket.status === 'USED';
  const isCancelled = ticket.status === 'CANCELLED';

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-8">
      <Card className="mx-auto w-full max-w-md overflow-hidden">
        {/* Status Header */}
        <div className={`p-6 text-center ${isActive ? 'bg-green-50' : isUsed ? 'bg-amber-50' : 'bg-red-50'}`}>
          {isActive && <CheckCircle className="mx-auto h-16 w-16 text-green-500" />}
          {isUsed && <UserCheck className="mx-auto h-16 w-16 text-amber-500" />}
          {isCancelled && <XCircle className="mx-auto h-16 w-16 text-red-500" />}
          <h1 className={`mt-3 text-xl font-bold ${isActive ? 'text-green-700' : isUsed ? 'text-amber-700' : 'text-red-700'}`}>
            {isActive ? 'Valid Ticket' : isUsed ? 'Already Used' : 'Cancelled'}
          </h1>
          <p className="mt-1 font-mono text-sm text-gray-500">{ticket.ticketCode}</p>
        </div>

        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500">Attendee</p>
              <p className="text-lg font-semibold text-gray-900">{ticket.attendeeName}</p>
              <p className="text-sm text-gray-500">{ticket.attendeeEmail}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Event</p>
              <p className="font-semibold text-gray-900">{ticket.orderItem.event.title}</p>
            </div>

            <div className="flex gap-6">
              <div>
                <p className="text-xs text-gray-500">Date</p>
                <div className="flex items-center gap-1 text-sm text-gray-700">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(ticket.orderItem.event.startDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Venue</p>
                <div className="flex items-center gap-1 text-sm text-gray-700">
                  <MapPin className="h-3.5 w-3.5" />
                  {ticket.orderItem.event.venue}
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500">Ticket Type</p>
              <p className="text-sm font-medium text-gray-700">{ticket.orderItem.ticketType.name}</p>
            </div>

            {isUsed && ticket.checkedInAt && (
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                Checked in at {new Date(ticket.checkedInAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            )}

            {isOrganiser && isActive && (
              <Button
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-5 text-base"
              >
                {checkingIn ? 'Checking in...' : 'Check In Attendee'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
