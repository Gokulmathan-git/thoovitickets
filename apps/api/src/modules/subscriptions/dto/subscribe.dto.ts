import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class SubscribeDto {
  @IsString()
  tier: string;

  @IsOptional()
  @IsBoolean()
  activateNow?: boolean;

  @IsOptional()
  @IsIn(['monthly', 'quarterly', 'half_yearly', 'yearly'])
  billingCycle?: string;
}
