import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  caption: string;

  @IsOptional()
  @IsIn(['FREE', 'SUBSCRIBERS'])
  visibility?: 'FREE' | 'SUBSCRIBERS';
}
