import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor() {
    const {
      S3_ENDPOINT,
      S3_REGION,
      S3_ACCESS_KEY_ID,
      S3_SECRET_ACCESS_KEY,
      S3_BUCKET,
    } = process.env;

    if (!S3_ENDPOINT || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_BUCKET) {
      throw new Error(
        'Missing S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY or S3_BUCKET in .env',
      );
    }

    this.bucket = S3_BUCKET;
    this.s3 = new S3Client({
      region: S3_REGION || 'us-east-1',
      endpoint: S3_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      },
      // Newer SDK versions add checksum parameters that MinIO and R2
      // can reject on presigned URLs.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  async onModuleInit() {
    if (process.env.S3_AUTO_CREATE_BUCKET !== 'true') return;
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Created bucket ${this.bucket}`);
      } catch (err) {
        this.logger.warn(`Could not reach or create bucket: ${String(err)}`);
      }
    }
  }

  presignUpload(key: string, expiresIn: number) {
    return getSignedUrl(
      this.s3,
      new PutObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }

  presignDownload(key: string, expiresIn: number) {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }

  async head(key: string) {
    try {
      const r = await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return { size: r.ContentLength ?? 0, contentType: r.ContentType ?? '' };
    } catch (e: any) {
      if (e?.name === 'NotFound' || e?.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw e;
    }
  }

  async remove(key: string) {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
