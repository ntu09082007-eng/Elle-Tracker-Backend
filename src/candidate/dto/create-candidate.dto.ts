import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateCandidateDto {
  @IsNumber()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsNotEmpty()
  @IsString()
  name?: string;
}
