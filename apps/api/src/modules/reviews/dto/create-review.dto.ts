import {
  IsString,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  content: string;

  @IsString()
  orderId: string;
}

export class CreateEventReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  content: string;

  @IsString()
  eventId: string;

  @IsString()
  orderId: string;
}

export class UpdateReviewDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  content?: string;
}
