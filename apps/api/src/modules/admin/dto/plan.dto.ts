import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePlanDto {
  @IsString()
  tier: string;

  @IsString()
  name: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  priceQuarterly?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  priceHalfYearly?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  priceYearly?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  maxEventsPerMonth: number;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  maxTicketTiers: number;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  maxTicketsPerEvent: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  maxStaffAccounts: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  commissionPercent: number;

  @IsOptional()
  @IsString()
  commissionType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sortOrder?: number;
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  priceQuarterly?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  priceHalfYearly?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  priceYearly?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  maxEventsPerMonth?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  maxTicketTiers?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  maxTicketsPerEvent?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  maxStaffAccounts?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  commissionPercent?: number;

  @IsOptional()
  @IsString()
  commissionType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sortOrder?: number;
}
