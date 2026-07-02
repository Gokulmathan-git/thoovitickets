import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import {
  GenerateDescriptionDto,
  ImproveDescriptionDto,
  ChatMessageDto,
  ReviewSuggestionDto,
} from './dto/generate-description.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@thoovitickets/shared';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Roles(UserRole.ORGANISER)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('generate-description')
  @HttpCode(HttpStatus.OK)
  generateDescription(@Body() dto: GenerateDescriptionDto) {
    return this.aiService.generateEventDescription(dto);
  }

  @Roles(UserRole.ORGANISER)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('improve-description')
  @HttpCode(HttpStatus.OK)
  improveDescription(@Body() dto: ImproveDescriptionDto) {
    return this.aiService.improveEventDescription(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  chat(
    @CurrentUser('id') userId: string | null,
    @Body() dto: ChatMessageDto,
  ) {
    return this.aiService.chatWithSupport(userId, dto.message);
  }

  @Post('review-suggestions')
  @HttpCode(HttpStatus.OK)
  reviewSuggestions(@Body() dto: ReviewSuggestionDto) {
    return this.aiService.generateReviewSuggestions(dto);
  }

  @Roles(UserRole.ADMIN)
  @Post('review-sentiment')
  @HttpCode(HttpStatus.OK)
  reviewSentiment() {
    return this.aiService.generateSentimentSummary();
  }
}
