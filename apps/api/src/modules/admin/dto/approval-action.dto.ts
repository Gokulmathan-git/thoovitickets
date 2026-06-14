import { IsEnum, IsOptional, IsString } from 'class-validator';

enum ActionType {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class ApprovalActionDto {
  @IsEnum(ActionType)
  action: ActionType;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
