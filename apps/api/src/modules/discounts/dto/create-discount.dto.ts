import { IsString, IsEnum, IsNumber, IsOptional, IsArray, IsDateString, IsInt, Min, Max, MinLength, MaxLength, Matches, IsBoolean } from 'class-validator';

export class CreateDiscountDto {
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[A-Z0-9_-]+$/i)
  code: string;

  @IsEnum(['FIXED', 'PERCENTAGE'])
  discountType: 'FIXED' | 'PERCENTAGE';

  @IsNumber()
  @Min(1)
  value: number;

  @IsString()
  eventId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ticketTypeIds?: string[];

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
