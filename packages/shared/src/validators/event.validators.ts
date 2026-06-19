import { z } from 'zod';

const ticketTypeSchema = z.object({
  name: z.string().min(1, 'Ticket name is required').max(100),
  description: z.string().optional(),
  price: z.number().min(0, 'Price cannot be negative'),
  currency: z.string().default('INR'),
  totalQty: z.number().int().min(1, 'Must have at least 1 ticket'),
  maxPerOrder: z.number().int().min(1).max(50).default(5),
  saleStart: z.string().datetime().optional(),
  saleEnd: z.string().datetime().optional(),
});

export const createEventBaseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200).trim(),
  description: z.string().min(20, 'Description must be at least 20 characters').trim(),
  shortDesc: z.string().max(300).optional(),
  venue: z.string().min(2, 'Venue is required').trim(),
  address: z.string().optional(),
  city: z.string().min(2, 'City is required').trim(),
  state: z.string().optional(),
  country: z.string().default('India'),
  startDate: z.string().datetime('Invalid start date'),
  endDate: z.string().datetime('Invalid end date'),
  categoryId: z.string().min(1, 'Category is required'),
  maxAttendees: z.number().int().min(1).optional(),
  tags: z.array(z.string()).default([]),
  timezone: z.string().default('Asia/Kolkata'),
  saleCutoffDate: z.string().datetime().optional(),
  ticketTypes: z.array(ticketTypeSchema).min(1, 'At least one ticket type is required'),
});

export const createEventSchema = createEventBaseSchema.refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  { message: 'End date must be after start date', path: ['endDate'] },
);

export const updateEventSchema = z.object({
  title: z.string().min(3).max(200).trim().optional(),
  description: z.string().min(20).trim().optional(),
  shortDesc: z.string().max(300).optional(),
  venue: z.string().min(2).trim().optional(),
  address: z.string().optional(),
  city: z.string().min(2).trim().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  categoryId: z.string().optional(),
  maxAttendees: z.number().int().min(1).optional(),
  tags: z.array(z.string()).optional(),
});

export const eventQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  category: z.string().optional(),
  city: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sort: z.enum(['date_asc', 'date_desc', 'price_asc', 'price_desc', 'newest']).default('date_asc'),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type CreateEventFormValues = z.input<typeof createEventBaseSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventQueryInput = z.infer<typeof eventQuerySchema>;
export type TicketTypeInput = z.infer<typeof ticketTypeSchema>;
