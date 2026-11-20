import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { MAX_MEDIA_PER_POST } from '../../media/media.constants';

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  caption?: string;

  @IsOptional()
  @IsIn(['FREE', 'SUBSCRIBERS'])
  visibility?: 'FREE' | 'SUBSCRIBERS';

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_MEDIA_PER_POST)
  @IsString({ each: true })
  mediaKeys?: string[];
}
