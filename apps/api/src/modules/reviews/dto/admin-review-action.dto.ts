import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';

enum ReviewActionType {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class AdminReviewActionDto {
  @IsEnum(ReviewActionType)
  action: ReviewActionType;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class ToggleVisibilityDto {
  @IsBoolean()
  isVisible: boolean;
}
