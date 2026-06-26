import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsDateString,
} from 'class-validator';

export class GenerateDescriptionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  venue?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  additionalInfo?: string;
}

export class ImproveDescriptionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(20)
  description: string;

  @IsOptional()
  @IsString()
  category?: string;
}

export class ChatMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class ReviewSuggestionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  keywords?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}
