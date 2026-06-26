import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  EVENT_DESCRIPTION_PROMPT,
  EVENT_DESCRIPTION_IMPROVE_PROMPT,
} from './prompts/event-description';
import {
  SUPPORT_CHAT_SYSTEM_PROMPT,
  buildSupportContext,
} from './prompts/support-chat';
import {
  REVIEW_SUGGESTION_PROMPT,
  REVIEW_SENTIMENT_SUMMARY_PROMPT,
} from './prompts/review-suggestion';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStatus, OrderStatus, ReviewStatus } from '@thoovitickets/database';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('openai.apiKey');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured — AI features will be unavailable');
    }
    this.openai = new OpenAI({ apiKey: apiKey || '' });
    this.model = this.configService.get<string>('openai.model') || 'gpt-5.4-mini';
  }

  async generateEventDescription(input: {
    title: string;
    category?: string;
    venue?: string;
    city?: string;
    startDate: string;
    endDate?: string;
    additionalInfo?: string;
  }) {
    const details = [`- Title: ${input.title}`, `- Date: ${input.startDate}${input.endDate ? ` to ${input.endDate}` : ''}`];
    if (input.category) details.push(`- Category: ${input.category}`);
    if (input.venue) details.push(`- Venue: ${input.venue}`);
    if (input.city) details.push(`- City: ${input.city}`);
    if (input.additionalInfo) details.push(`- Additional Info: ${input.additionalInfo}`);

    const result = await this.callOpenAI(
      EVENT_DESCRIPTION_PROMPT,
      `Event Details:\n${details.join('\n')}\n\nGenerate the JSON response:`,
    );
    return this.parseJsonResponse(result);
  }

  async improveEventDescription(input: {
    title: string;
    description: string;
    category?: string;
  }) {
    const userPrompt = `Event Title: ${input.title}
${input.category ? `Category: ${input.category}` : ''}
Current Description: ${input.description}

Generate the improved JSON response:`;

    const result = await this.callOpenAI(EVENT_DESCRIPTION_IMPROVE_PROMPT, userPrompt);
    return this.parseJsonResponse(result);
  }

  async chatWithSupport(userId: string | null, message: string) {
    let contextData = {};

    if (userId) {
      const [orders, upcomingEvents] = await Promise.all([
        this.prisma.order.findMany({
          where: { userId, status: { in: [OrderStatus.CONFIRMED, OrderStatus.REFUNDED] } },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            items: { include: { event: { select: { title: true } } } },
            tickets: { select: { id: true, status: true } },
          },
        }),
        this.prisma.event.findMany({
          where: { status: EventStatus.PUBLISHED, startDate: { gte: new Date() } },
          orderBy: { startDate: 'asc' },
          take: 5,
          select: { title: true, startDate: true, venue: true, city: true, status: true },
        }),
      ]);

      contextData = {
        events: upcomingEvents.map(e => ({
          title: e.title,
          date: e.startDate.toLocaleDateString('en-IN', { dateStyle: 'long' }),
          venue: e.venue,
          city: e.city,
          status: e.status,
        })),
        orders: orders.map(o => ({
          id: o.id,
          eventTitle: o.items[0]?.event?.title || 'Unknown Event',
          status: o.status,
          totalAmount: o.totalAmount.toString(),
          ticketCount: o.tickets.length,
          createdAt: o.createdAt.toLocaleDateString('en-IN', { dateStyle: 'medium' }),
        })),
      };
    }

    const context = buildSupportContext(contextData);
    const systemPrompt = `${SUPPORT_CHAT_SYSTEM_PROMPT}\n\n--- Platform Context ---\n${context}`;
    const reply = await this.callOpenAI(systemPrompt, message);
    return { reply };
  }

  async generateReviewSuggestions(input: { keywords?: string; rating?: number }) {
    const userPrompt = `User's rating: ${input.rating || 'not specified'} out of 5 stars
User's keywords/thoughts: ${input.keywords || 'general positive experience'}

Generate the JSON response:`;

    const result = await this.callOpenAI(REVIEW_SUGGESTION_PROMPT, userPrompt);
    return this.parseJsonResponse(result);
  }

  async generateSentimentSummary() {
    const reviews = await this.prisma.platformReview.findMany({
      where: { status: ReviewStatus.APPROVED },
      select: { rating: true, content: true },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    if (reviews.length === 0) {
      return {
        overallSentiment: { positive: 0, neutral: 0, negative: 0 },
        executiveSummary: 'No approved reviews yet to analyze.',
        positiveThemes: [],
        improvementAreas: [],
      };
    }

    const reviewsText = reviews
      .map((r, i) => `Review ${i + 1} (${r.rating}/5): ${r.content}`)
      .join('\n');

    const userPrompt = `Reviews to analyze (${reviews.length} total):\n${reviewsText}\n\nGenerate the JSON response:`;

    const result = await this.callOpenAI(REVIEW_SENTIMENT_SUMMARY_PROMPT, userPrompt);
    return this.parseJsonResponse(result);
  }

  private async callOpenAI(systemPrompt: string, userMessage: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error: any) {
      const errorMsg = error?.message || '';
      this.logger.error('OpenAI API call failed', errorMsg);

      if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('rate')) {
        throw new BadRequestException(
          'AI rate limit reached. Please wait a moment and try again.',
        );
      }

      if (errorMsg.includes('401') || errorMsg.includes('invalid_api_key')) {
        throw new BadRequestException(
          'AI service not configured. Please check your OpenAI API key.',
        );
      }

      throw new BadRequestException(
        'AI service is temporarily unavailable. Please try again later.',
      );
    }
  }

  private parseJsonResponse(text: string): Record<string, unknown> {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch {
      this.logger.error('Failed to parse AI response as JSON', text);
      throw new BadRequestException(
        'AI generated an invalid response. Please try again.',
      );
    }
  }
}
