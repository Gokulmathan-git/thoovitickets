import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGstBillDto {
  @IsString()
  organiserId: string;

  @IsOptional()
  @IsString()
  settlementId?: string;

  @IsDateString()
  billDate: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  companyGst?: string;

  @IsOptional()
  @IsString()
  companyPan?: string;

  @IsOptional()
  @IsString()
  companyAddress?: string;

  @IsString()
  orgName: string;

  @IsOptional()
  @IsString()
  orgGstNumber?: string;

  @IsOptional()
  @IsString()
  orgAddress?: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  hsnCode?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rate: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cgstPercent: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sgstPercent: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  igstPercent: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateGstBillDto {
  @IsOptional()
  @IsDateString()
  billDate?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  companyGst?: string;

  @IsOptional()
  @IsString()
  companyPan?: string;

  @IsOptional()
  @IsString()
  companyAddress?: string;

  @IsOptional()
  @IsString()
  orgName?: string;

  @IsOptional()
  @IsString()
  orgGstNumber?: string;

  @IsOptional()
  @IsString()
  orgAddress?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  hsnCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cgstPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sgstPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  igstPercent?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
