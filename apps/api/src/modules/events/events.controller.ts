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
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventDto } from './dto/query-event.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@thoovitickets/shared';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Public()
  @Get()
  findAllPublic(@Query() query: QueryEventDto) {
    return this.eventsService.findAllPublic(query);
  }

  @Public()
  @Get('featured')
  findFeatured() {
    return this.eventsService.findFeatured();
  }

  @Public()
  @Get('cities')
  getCities() {
    return this.eventsService.getCities();
  }

  @Public()
  @Get('detail/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.eventsService.findBySlug(slug);
  }

  @Roles(UserRole.ORGANISER)
  @Get('my')
  findMyEvents(
    @CurrentUser('id') organiserId: string,
    @Query('status') status?: string,
  ) {
    return this.eventsService.findMyEvents(organiserId, status);
  }

  @Roles(UserRole.ORGANISER)
  @Get('my/:id')
  findOneForOrganiser(
    @Param('id') id: string,
    @CurrentUser('id') organiserId: string,
  ) {
    return this.eventsService.findOneForOrganiser(id, organiserId);
  }

  @Roles(UserRole.ORGANISER)
  @Post()
  create(
    @CurrentUser('id') organiserId: string,
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.create(organiserId, dto);
  }

  @Roles(UserRole.ORGANISER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('id') organiserId: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, organiserId, dto);
  }

  @Roles(UserRole.ORGANISER)
  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  submitForApproval(
    @Param('id') id: string,
    @CurrentUser('id') organiserId: string,
  ) {
    return this.eventsService.submitForApproval(id, organiserId);
  }

  @Roles(UserRole.ORGANISER)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(
    @Param('id') id: string,
    @CurrentUser('id') organiserId: string,
  ) {
    return this.eventsService.delete(id, organiserId);
  }
}
