import { create } from 'zustand';
import type { AttendeeInfo } from '@/components/events/attendee-form';

export interface CartItem {
  id: string;
  quantity: number;
  ticketType: {
    id: string;
    name: string;
    price: number;
    currency: string;
    maxPerOrder: number;
    available: number;
  };
  event: {
    id: string;
    title: string;
    slug: string;
    startDate: string;
    venue: string;
    city: string;
    imageUrl: string | null;
  };
}

interface CartState {
  items: CartItem[];
  attendees: AttendeeInfo[];
  total: number;
  itemCount: number;
  eventId: string | null; // current event in cart — single-event mode
  isGuest: boolean;

  // Logged-in user actions (server cart)
  setCart: (items: CartItem[], total: number, itemCount: number) => void;

  // Guest actions (localStorage)
  setGuestCheckout: (items: CartItem[], attendees: AttendeeInfo[], eventId: string) => void;
  addGuestItem: (item: CartItem) => void;
  updateGuestItem: (ticketTypeId: string, quantity: number) => void;
  removeGuestItem: (ticketTypeId: string) => void;
  loadGuestCart: () => void;

  // Shared
  setAttendees: (attendees: AttendeeInfo[]) => void;
  setEventId: (eventId: string) => void;
  clearCart: () => void;
}

const GUEST_CART_KEY = 'thoovitickets_guest_cart';
const ATTENDEES_KEY = 'thoovitickets_attendees';

function calcTotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.ticketType.price * item.quantity, 0);
}

function calcCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  attendees: [],
  total: 0,
  itemCount: 0,
  eventId: null,
  isGuest: false,

  setCart: (items, total, itemCount) => set({ items, total, itemCount, isGuest: false }),

  setGuestCheckout: (items, attendees, eventId) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
      localStorage.setItem(ATTENDEES_KEY, JSON.stringify(attendees));
    }
    set({ items, attendees, total: calcTotal(items), itemCount: calcCount(items), eventId, isGuest: true });
  },

  addGuestItem: (item) => {
    const items = [...get().items];
    const existing = items.find((i) => i.ticketType.id === item.ticketType.id);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + item.quantity, item.ticketType.maxPerOrder);
    } else {
      items.push(item);
    }
    if (typeof window !== 'undefined') localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    set({ items, total: calcTotal(items), itemCount: calcCount(items), isGuest: true, eventId: item.event.id });
  },

  updateGuestItem: (ticketTypeId, quantity) => {
    const items = get().items.map((i) => i.ticketType.id === ticketTypeId ? { ...i, quantity } : i);
    if (typeof window !== 'undefined') localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    set({ items, total: calcTotal(items), itemCount: calcCount(items) });
  },

  removeGuestItem: (ticketTypeId) => {
    const items = get().items.filter((i) => i.ticketType.id !== ticketTypeId);
    if (typeof window !== 'undefined') localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    set({ items, total: calcTotal(items), itemCount: calcCount(items) });
  },

  loadGuestCart: () => {
    if (typeof window === 'undefined') return;
    try {
      const items = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]');
      const attendees = JSON.parse(localStorage.getItem(ATTENDEES_KEY) || '[]');
      if (items.length > 0) {
        set({ items, attendees, total: calcTotal(items), itemCount: calcCount(items), isGuest: true, eventId: items[0]?.event?.id || null });
      }
    } catch { /* ignore */ }
  },

  setAttendees: (attendees) => {
    if (typeof window !== 'undefined') localStorage.setItem(ATTENDEES_KEY, JSON.stringify(attendees));
    set({ attendees });
  },

  setEventId: (eventId) => set({ eventId }),

  clearCart: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(GUEST_CART_KEY);
      localStorage.removeItem(ATTENDEES_KEY);
    }
    set({ items: [], attendees: [], total: 0, itemCount: 0, eventId: null });
  },
}));
