import { IsEmail, IsString, IsArray, IsInt, Min, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { AttendeeDto } from './create-order.dto';

class OrderItemDto {
  @IsString()
  ticketTypeId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateGuestOrderDto {
  @IsEmail()
  guestEmail: string;

  @IsString()
  guestName: string;

  @IsOptional()
  @IsString()
  guestPhone?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendeeDto)
  attendees?: AttendeeDto[];

  @IsOptional()
  @IsString()
  discountCode?: string;
}
