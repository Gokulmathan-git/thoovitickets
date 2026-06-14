import { IsEnum, IsOptional, IsString } from 'class-validator';

enum StatusAction {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
}

export class UpdateUserStatusDto {
  @IsEnum(StatusAction)
  status: StatusAction;

  @IsOptional()
  @IsString()
  reason?: string;
}
