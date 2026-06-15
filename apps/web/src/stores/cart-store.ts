import { create } from 'zustand';

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
  total: number;
  itemCount: number;
  isGuest: boolean;
  setCart: (items: CartItem[], total: number, itemCount: number) => void;
  setGuestCart: (items: CartItem[]) => void;
  addGuestItem: (item: CartItem) => void;
  updateGuestItem: (ticketTypeId: string, quantity: number) => void;
  removeGuestItem: (ticketTypeId: string) => void;
  clearCart: () => void;
  loadGuestCart: () => void;
}

const GUEST_CART_KEY = 'thoovitickets_guest_cart';

function saveToStorage(items: CartItem[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  }
}

function loadFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(GUEST_CART_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function calcTotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.ticketType.price * item.quantity, 0);
}

function calcCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  total: 0,
  itemCount: 0,
  isGuest: false,

  setCart: (items, total, itemCount) => set({ items, total, itemCount, isGuest: false }),

  setGuestCart: (items) => {
    saveToStorage(items);
    set({ items, total: calcTotal(items), itemCount: calcCount(items), isGuest: true });
  },

  addGuestItem: (item) => {
    const items = [...get().items];
    const existing = items.find((i) => i.ticketType.id === item.ticketType.id);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + item.quantity, item.ticketType.maxPerOrder);
    } else {
      items.push(item);
    }
    saveToStorage(items);
    set({ items, total: calcTotal(items), itemCount: calcCount(items), isGuest: true });
  },

  updateGuestItem: (ticketTypeId, quantity) => {
    const items = get().items.map((i) =>
      i.ticketType.id === ticketTypeId ? { ...i, quantity } : i,
    );
    saveToStorage(items);
    set({ items, total: calcTotal(items), itemCount: calcCount(items) });
  },

  removeGuestItem: (ticketTypeId) => {
    const items = get().items.filter((i) => i.ticketType.id !== ticketTypeId);
    saveToStorage(items);
    set({ items, total: calcTotal(items), itemCount: calcCount(items) });
  },

  clearCart: () => {
    if (typeof window !== 'undefined') localStorage.removeItem(GUEST_CART_KEY);
    set({ items: [], total: 0, itemCount: 0 });
  },

  loadGuestCart: () => {
    const items = loadFromStorage();
    if (items.length > 0) {
      set({ items, total: calcTotal(items), itemCount: calcCount(items), isGuest: true });
    }
  },
}));
