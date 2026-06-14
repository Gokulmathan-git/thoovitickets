import { IsEnum } from 'class-validator';

enum TierOption {
  FREE = 'FREE',
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE',
}

export class SubscribeDto {
  @IsEnum(TierOption)
  tier: TierOption;
}
