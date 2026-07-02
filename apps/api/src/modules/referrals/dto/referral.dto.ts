import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';

export class AdminUpdateReferralDto {
  @IsEnum(['QUALIFIED', 'REWARDED', 'REJECTED'])
  status: 'QUALIFIED' | 'REWARDED' | 'REJECTED';

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class AdminCreditPointsDto {
  @IsString()
  userId: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  points: number;

  @IsString()
  description: string;
}

export class AdminDebitPointsDto {
  @IsString()
  userId: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  points: number;

  @IsString()
  description: string;
}
