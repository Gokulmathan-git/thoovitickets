import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, CreateEventReviewDto, UpdateReviewDto } from './dto/create-review.dto';
import { AdminReviewActionDto, ToggleVisibilityDto } from './dto/admin-review-action.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@thoovitickets/shared';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get('public')
  findPublic(@Query('limit') limit?: string) {
    return this.reviewsService.findApprovedForHomepage(Math.min(limit ? parseInt(limit, 10) : 10, 50));
  }

  @Roles(UserRole.ADMIN)
  @Get('admin')
  findAllAdmin(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.findAllAdmin({
      status,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: Math.min(limit ? parseInt(limit, 10) : 20, 100),
    });
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/stats')
  getStats() {
    return this.reviewsService.getStats();
  }

  @Roles(UserRole.ADMIN)
  @Post('admin/:id/action')
  @HttpCode(HttpStatus.OK)
  adminAction(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: AdminReviewActionDto,
  ) {
    return this.reviewsService.adminAction(id, adminId, dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch('admin/:id/visibility')
  toggleVisibility(
    @Param('id') id: string,
    @Body() dto: ToggleVisibilityDto,
  ) {
    return this.reviewsService.toggleVisibility(id, dto.isVisible);
  }

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(userId, dto);
  }

  @Get('my')
  findMyReviews(@CurrentUser('id') userId: string) {
    return this.reviewsService.findMyReviews(userId);
  }

  @Get('order/:orderId')
  findByOrder(
    @Param('orderId') orderId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewsService.findByOrder(orderId, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewsService.delete(userId, id);
  }

  // ─── EVENT REVIEWS ─────────────────────────────────

  @Post('event')
  createEventReview(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateEventReviewDto,
  ) {
    return this.reviewsService.createEventReview(userId, dto);
  }

  @Get('event/user/:eventId')
  findEventReviewByUser(
    @CurrentUser('id') userId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.reviewsService.findEventReviewByUser(userId, eventId);
  }

  @Public()
  @Get('event/public/:eventId')
  findEventReviewsPublic(@Param('eventId') eventId: string) {
    return this.reviewsService.findEventReviewsPublic(eventId);
  }

  @Roles(UserRole.ORGANISER)
  @Get('event/organiser/:eventId')
  findEventReviewsForOrganiser(
    @CurrentUser('id') organiserId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.reviewsService.findEventReviewsForOrganiser(organiserId, eventId);
  }

  @Roles(UserRole.ORGANISER)
  @Patch('event/:id/visibility')
  toggleEventReviewVisibility(
    @CurrentUser('id') organiserId: string,
    @Param('id') id: string,
    @Body() dto: { isVisible: boolean },
  ) {
    return this.reviewsService.toggleEventReviewVisibility(organiserId, id, dto.isVisible);
  }
}
