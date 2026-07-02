import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength, Equals } from 'class-validator';

enum RegisterRole {
  CUSTOMER = 'CUSTOMER',
  ORGANISER = 'ORGANISER',
}

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(RegisterRole)
  role: RegisterRole;

  @IsOptional()
  @IsString()
  @MinLength(2)
  orgName?: string;

  @IsOptional()
  @IsString()
  orgDescription?: string;

  @IsBoolean()
  @Equals(true, { message: 'You must accept the Terms of Service' })
  termsAccepted: boolean;
}
