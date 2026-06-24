import { IsOptional, IsString, MaxLength, MinLength, IsIn } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  orgName?: string;

  @IsOptional()
  @IsString()
  orgDescription?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  idDocumentUrl?: string;

  @IsOptional()
  @IsString()
  @IsIn(['AADHAR', 'PAN'])
  idDocumentType?: string;

  @IsOptional()
  @IsString()
  aadharDocumentUrl?: string;

  @IsOptional()
  @IsString()
  panDocumentUrl?: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;
}
