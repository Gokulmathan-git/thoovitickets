import { IsString, IsArray, IsEmail } from 'class-validator';

export class SendDiscountEmailDto {
  @IsArray()
  @IsEmail({}, { each: true })
  recipientEmails: string[];

  @IsString()
  subject: string;

  @IsString()
  message: string;
}
