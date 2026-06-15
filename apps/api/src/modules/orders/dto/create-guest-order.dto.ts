import { IsEmail, IsString, IsArray, IsInt, Min, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

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
}
