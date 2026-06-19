'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, User, ChevronDown, ChevronUp } from 'lucide-react';

interface TicketSelection {
  ticketTypeId: string;
  ticketName: string;
  price: number;
  quantity: number;
}

export interface AttendeeInfo {
  ticketTypeId: string;
  ticketName: string;
  name: string;
  email: string;
  phone: string;
}

interface AttendeeFormProps {
  tickets: TicketSelection[];
  onSubmit: (attendees: AttendeeInfo[]) => void;
  onClose: () => void;
  loading: boolean;
}

export function AttendeeForm({ tickets, onSubmit, onClose, loading }: AttendeeFormProps) {
  // Build initial attendee list — one entry per ticket
  const initialAttendees: AttendeeInfo[] = [];
  tickets.forEach((t) => {
    for (let i = 0; i < t.quantity; i++) {
      initialAttendees.push({
        ticketTypeId: t.ticketTypeId,
        ticketName: t.ticketName,
        name: '',
        email: '',
        phone: '',
      });
    }
  });

  const [attendees, setAttendees] = useState<AttendeeInfo[]>(initialAttendees);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedIdx, setExpandedIdx] = useState(0);

  // Lock background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const updateAttendee = (index: number, field: keyof AttendeeInfo, value: string) => {
    setAttendees((prev) => prev.map((a, i) => i === index ? { ...a, [field]: value } : a));
    setErrors((prev) => { const next = { ...prev }; delete next[`${index}-${field}`]; return next; });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    attendees.forEach((a, i) => {
      if (!a.name.trim()) errs[`${i}-name`] = 'Name is required';
      if (!a.email.trim() || !/\S+@\S+\.\S+/.test(a.email)) errs[`${i}-email`] = 'Valid email required';
      if (!a.phone.trim() || a.phone.replace(/\D/g, '').length < 8) errs[`${i}-phone`] = 'Valid phone required';
    });
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const firstErrorIdx = parseInt(Object.keys(errs)[0].split('-')[0]);
      setExpandedIdx(firstErrorIdx);
    }
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit(attendees);
  };

  const totalTickets = attendees.length;
  const filledCount = attendees.filter((a) => a.name && a.email && a.phone).length;

  // Group attendees by ticket type for display
  let ticketCounter: Record<string, number> = {};

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white dark:bg-gray-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Attendee Information</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{filledCount}/{totalTickets} tickets filled</p>
          </div>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-800 shrink-0">
          <div
            className="h-full bg-orange-500 transition-all duration-300"
            style={{ width: `${totalTickets > 0 ? (filledCount / totalTickets) * 100 : 0}%` }}
          />
        </div>

        {/* Attendee Cards */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
          {attendees.map((attendee, index) => {
            if (!ticketCounter[attendee.ticketTypeId]) ticketCounter[attendee.ticketTypeId] = 0;
            ticketCounter[attendee.ticketTypeId]++;
            const ticketNum = ticketCounter[attendee.ticketTypeId];
            const isExpanded = expandedIdx === index;
            const isFilled = attendee.name && attendee.email && attendee.phone;

            return (
              <div
                key={index}
                className={`rounded-xl border-2 transition-all ${
                  isExpanded ? 'border-orange-400 bg-orange-50/30 dark:bg-orange-900/10' : isFilled ? 'border-green-300 bg-green-50/30 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Ticket Header */}
                <button
                  type="button"
                  onClick={() => setExpandedIdx(isExpanded ? -1 : index)}
                  className="flex w-full items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                      isFilled ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}>
                      {isFilled ? '✓' : <User className="h-4 w-4" />}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {attendee.ticketName} — Ticket #{ticketNum}
                      </p>
                      {isFilled && !isExpanded && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{attendee.name} · {attendee.email}</p>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400 dark:text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />}
                </button>

                {/* Form Fields */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-800 p-4 space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">Full Name *</label>
                      <input
                        className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition ${
                          errors[`${index}-name`] ? 'border-red-400' : 'border-gray-200 dark:border-gray-700 focus:border-orange-400'
                        }`}
                        placeholder="Enter attendee name"
                        value={attendee.name}
                        onChange={(e) => updateAttendee(index, 'name', e.target.value)}
                      />
                      {errors[`${index}-name`] && <p className="mt-1 text-xs text-red-500">{errors[`${index}-name`]}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">Email *</label>
                      <input
                        className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition ${
                          errors[`${index}-email`] ? 'border-red-400' : 'border-gray-200 dark:border-gray-700 focus:border-orange-400'
                        }`}
                        type="email"
                        placeholder="attendee@email.com"
                        value={attendee.email}
                        onChange={(e) => updateAttendee(index, 'email', e.target.value)}
                      />
                      {errors[`${index}-email`] && <p className="mt-1 text-xs text-red-500">{errors[`${index}-email`]}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">Phone *</label>
                      <input
                        className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition ${
                          errors[`${index}-phone`] ? 'border-red-400' : 'border-gray-200 dark:border-gray-700 focus:border-orange-400'
                        }`}
                        type="tel"
                        placeholder="+91 9876543210"
                        value={attendee.phone}
                        onChange={(e) => updateAttendee(index, 'phone', e.target.value)}
                      />
                      {errors[`${index}-phone`] && <p className="mt-1 text-xs text-red-500">{errors[`${index}-phone`]}</p>}
                    </div>
                    {index < totalTickets - 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => setExpandedIdx(index + 1)}
                      >
                        Next Ticket →
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 shrink-0">
          <Button
            className="w-full rounded-xl bg-orange-500 py-5 text-base font-bold text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Adding to Cart...' : `Continue — ${totalTickets} Ticket${totalTickets !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
