import { IsInt, Min, Max } from 'class-validator';

export class UpdateCartItemDto {
  @IsInt()
  @Min(1)
  @Max(50)
  quantity: number;
}
