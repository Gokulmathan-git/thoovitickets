import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  IsArray,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(20)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  shortDesc?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  venue?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttendees?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsDateString()
  saleCutoffDate?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  [key: string]: unknown;
}
