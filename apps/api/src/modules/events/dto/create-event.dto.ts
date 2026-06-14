import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsArray,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';

export class TicketTypeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsInt()
  @Min(1)
  totalQty: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxPerOrder?: number;

  @IsOptional()
  @IsDateString()
  saleStart?: string;

  @IsOptional()
  @IsDateString()
  saleEnd?: string;
}

export class CreateEventDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(20)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  shortDesc?: string;

  @IsString()
  @MinLength(2)
  venue: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsString()
  @MinLength(2)
  city: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  categoryId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttendees?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => TicketTypeDto)
  ticketTypes: TicketTypeDto[];
}
