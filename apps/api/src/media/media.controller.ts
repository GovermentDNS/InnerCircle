import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { MediaService } from './media.service';
import { UploadUrlDto } from './dto/upload-url.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('media')
export class MediaController {
  constructor(private media: MediaService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR')
  @Post('upload-url')
  uploadUrl(@CurrentUser() user: { id: string }, @Body() dto: UploadUrlDto) {
    return this.media.createUploadUrl(user.id, dto.mimeType);
  }
}
