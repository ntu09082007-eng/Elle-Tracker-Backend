import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateCandidateDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsNotEmpty()
  @IsString()
  name?: string;
}
