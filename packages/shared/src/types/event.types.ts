import { EventStatus } from '../constants/roles';

export interface EventCategoryResponse {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface TicketTypeResponse {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  totalQty: number;
  soldQty: number;
  maxPerOrder: number;
  saleStart: string | null;
  saleEnd: string | null;
  isActive: boolean;
  availableQty: number;
}

export interface EventResponse {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDesc: string | null;
  venue: string;
  address: string | null;
  city: string;
  state: string | null;
  country: string;
  startDate: string;
  endDate: string;
  imageUrl: string | null;
  bannerUrl: string | null;
  status: EventStatus;
  isFeatured: boolean;
  maxAttendees: number | null;
  tags: string[];
  categoryId: string;
  organiserId: string;
  createdAt: string;
  updatedAt: string;
  category?: EventCategoryResponse;
  ticketTypes?: TicketTypeResponse[];
  organiser?: {
    id: string;
    firstName: string;
    lastName: string;
    orgName: string | null;
  };
}

export interface EventListResponse {
  events: EventResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
