import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateGuestOrderDto } from './dto/create-guest-order.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  createOrder(@CurrentUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.createFromCart(userId, dto);
  }

  @Public()
  @Post('guest')
  createGuestOrder(@Body() dto: CreateGuestOrderDto) {
    return this.ordersService.createGuestOrder(dto);
  }

  @Public()
  @Post('guest/:id/confirm')
  @HttpCode(HttpStatus.OK)
  confirmGuestOrder(@Param('id') orderId: string, @Body('guestEmail') guestEmail: string) {
    return this.ordersService.confirmGuestOrder(orderId, guestEmail);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  confirmOrder(@Param('id') orderId: string, @CurrentUser('id') userId: string) {
    return this.ordersService.confirmOrder(orderId, userId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelOrder(@Param('id') orderId: string, @CurrentUser('id') userId: string) {
    return this.ordersService.cancelOrder(orderId, userId);
  }

  @Get()
  getMyOrders(@CurrentUser('id') userId: string) {
    return this.ordersService.getMyOrders(userId);
  }

  @Get(':id')
  getOrderById(@Param('id') orderId: string, @CurrentUser('id') userId: string) {
    return this.ordersService.getOrderById(orderId, userId);
  }
}
