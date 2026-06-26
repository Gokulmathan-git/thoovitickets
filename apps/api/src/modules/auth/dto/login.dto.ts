import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Please enter your password.' })
  password: string;
}
