import { create } from 'zustand';

interface CartItem {
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
  setCart: (items: CartItem[], total: number, itemCount: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  total: 0,
  itemCount: 0,
  setCart: (items, total, itemCount) => set({ items, total, itemCount }),
  clearCart: () => set({ items: [], total: 0, itemCount: 0 }),
}));
