import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GstBillsService } from './gst-bills.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@thoovitickets/shared';
import { CreateGstBillDto, UpdateGstBillDto } from './dto/gst-bill.dto';

@Controller('gst-bills')
export class GstBillsController {
  constructor(private readonly gstBillsService: GstBillsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateGstBillDto) {
    return this.gstBillsService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.gstBillsService.findAll();
  }

  @Get('organisers')
  @Roles(UserRole.ADMIN)
  getOrganisers() {
    return this.gstBillsService.getOrganisers();
  }

  @Get('organiser/:organiserId/settlements')
  @Roles(UserRole.ADMIN)
  getOrganiserSettlements(@Param('organiserId') organiserId: string) {
    return this.gstBillsService.getOrganiserSettlements(organiserId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.gstBillsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateGstBillDto) {
    return this.gstBillsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  delete(@Param('id') id: string) {
    return this.gstBillsService.delete(id);
  }
}
