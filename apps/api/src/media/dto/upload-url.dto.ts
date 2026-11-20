import { IsIn } from 'class-validator';
import { ALLOWED_MEDIA } from '../media.constants';

export class UploadUrlDto {
  @IsIn(Array.from(ALLOWED_MEDIA.keys()))
  mimeType: string;
}
