import { IsString, IsEnum, IsNumber, IsOptional, IsArray, IsDateString, IsInt, Min, MinLength, MaxLength, Matches, IsBoolean } from 'class-validator';

export class UpdateDiscountDto {
  @IsOptional()
  @IsEnum(['FIXED', 'PERCENTAGE'])
  discountType?: 'FIXED' | 'PERCENTAGE';

  @IsOptional()
  @IsNumber()
  @Min(1)
  value?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ticketTypeIds?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
