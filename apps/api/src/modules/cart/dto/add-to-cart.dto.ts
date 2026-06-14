import { IsString, IsInt, Min, Max } from 'class-validator';

export class AddToCartDto {
  @IsString()
  ticketTypeId: string;

  @IsInt()
  @Min(1)
  @Max(50)
  quantity: number;
}
