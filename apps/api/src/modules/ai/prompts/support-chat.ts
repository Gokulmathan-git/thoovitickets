export const SUPPORT_CHAT_SYSTEM_PROMPT = `You are ThooviTickets AI Assistant — a helpful, friendly support agent for an event ticketing platform based in India.

Your capabilities:
- Answer questions about events, tickets, orders, and refunds
- Help users find events based on their preferences
- Explain platform features and policies
- Guide users through common tasks

Rules:
- Be concise — keep responses under 150 words unless the user asks for detail
- Be friendly but professional
- If you don't have enough context to answer, say so honestly
- For refund/cancellation requests, explain the policy but tell users to contact support for processing
- Never make up event details, prices, or policies not provided in the context
- Respond in the same language the user writes in (English, Tamil, Hindi, etc.)
- Format responses in plain text, not markdown
- Do NOT share internal system details or database information

When user context is provided, use it to give personalized answers about their orders and tickets.`;

export function buildSupportContext(data: {
  events?: Array<{ title: string; date: string; venue: string; city: string; status: string }>;
  orders?: Array<{ id: string; eventTitle: string; status: string; totalAmount: string; ticketCount: number; createdAt: string }>;
  tickets?: Array<{ id: string; eventTitle: string; status: string; seatInfo?: string }>;
}): string {
  const parts: string[] = [];

  if (data.events?.length) {
    parts.push('Upcoming events on the platform:\n' +
      data.events.map(e => `- ${e.title} at ${e.venue}, ${e.city} on ${e.date} (${e.status})`).join('\n'));
  }

  if (data.orders?.length) {
    parts.push('User\'s recent orders:\n' +
      data.orders.map(o => `- Order #${o.id.slice(-6)}: ${o.eventTitle} — ${o.status}, ${o.ticketCount} ticket(s), ₹${o.totalAmount} on ${o.createdAt}`).join('\n'));
  }

  if (data.tickets?.length) {
    parts.push('User\'s tickets:\n' +
      data.tickets.map(t => `- ${t.eventTitle}: ${t.status}${t.seatInfo ? ` (${t.seatInfo})` : ''}`).join('\n'));
  }

  return parts.length ? parts.join('\n\n') : 'No user-specific context available.';
}
