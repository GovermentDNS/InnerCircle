import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  ALLOWED_MEDIA,
  DOWNLOAD_URL_TTL_SECONDS,
  MEDIA_KEY_PATTERN,
  MediaKind,
  UPLOAD_URL_TTL_SECONDS,
} from './media.constants';

export type VerifiedMedia = {
  storageKey: string;
  mimeType: string;
  type: MediaKind;
  sizeBytes: number;
};

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async createUploadUrl(userId: string, mimeType: string) {
    const rule = ALLOWED_MEDIA.get(mimeType);
    if (!rule) throw new BadRequestException('Unsupported file type');

    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) throw new ForbiddenException('Creator profile required');

    const key = `creators/${profile.id}/${randomUUID()}.${rule.ext}`;
    const uploadUrl = await this.storage.presignUpload(
      key,
      UPLOAD_URL_TTL_SECONDS,
    );

    return {
      key,
      uploadUrl,
      method: 'PUT',
      requiredHeaders: { 'Content-Type': mimeType },
      expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
      maxBytes: rule.maxBytes,
    };
  }

  // Confirms each uploaded file exists, belongs to this creator, and is the
  // type and size we allow. Rejected files are deleted from storage.
  async verifyUploads(
    profileId: string,
    keys: string[],
  ): Promise<VerifiedMedia[]> {
    const prefix = `creators/${profileId}/`;
    for (const key of keys) {
      if (!MEDIA_KEY_PATTERN.test(key) || !key.startsWith(prefix)) {
        throw new BadRequestException('Invalid media key');
      }
    }

    const reused = await this.prisma.media.findFirst({
      where: { storageKey: { in: keys } },
      select: { id: true },
    });
    if (reused) {
      throw new BadRequestException(
        'A media file is already attached to a post',
      );
    }

    const results: VerifiedMedia[] = [];
    for (const key of keys) {
      const head = await this.storage.head(key);
      if (!head) {
        throw new BadRequestException(
          'Uploaded file not found. Upload it before creating the post',
        );
      }

      const mime = head.contentType.split(';')[0].trim().toLowerCase();
      const rule = ALLOWED_MEDIA.get(mime);
      const valid =
        !!rule &&
        key.endsWith(`.${rule.ext}`) &&
        head.size > 0 &&
        head.size <= rule.maxBytes;

      if (!rule || !valid) {
        await this.storage.remove(key);
        throw new BadRequestException(
          'File rejected: wrong type for this upload, or too large',
        );
      }

      results.push({
        storageKey: key,
        mimeType: mime,
        type: rule.kind,
        sizeBytes: head.size,
      });
    }
    return results;
  }

  urlFor(storageKey: string) {
    return this.storage.presignDownload(storageKey, DOWNLOAD_URL_TTL_SECONDS);
  }
}
