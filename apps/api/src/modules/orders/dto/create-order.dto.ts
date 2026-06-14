import { IsOptional, IsString, IsEmail } from 'class-validator';

export class CreateOrderDto {
  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @IsOptional()
  @IsString()
  guestName?: string;

  @IsOptional()
  @IsString()
  guestPhone?: string;
}
