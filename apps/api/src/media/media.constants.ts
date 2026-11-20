export type MediaKind = 'IMAGE' | 'VIDEO';

export const ALLOWED_MEDIA = new Map<
  string,
  { ext: string; kind: MediaKind; maxBytes: number }
>([
  ['image/jpeg', { ext: 'jpg', kind: 'IMAGE', maxBytes: 10 * 1024 * 1024 }],
  ['image/png', { ext: 'png', kind: 'IMAGE', maxBytes: 10 * 1024 * 1024 }],
  ['image/webp', { ext: 'webp', kind: 'IMAGE', maxBytes: 10 * 1024 * 1024 }],
  ['video/mp4', { ext: 'mp4', kind: 'VIDEO', maxBytes: 200 * 1024 * 1024 }],
  ['video/webm', { ext: 'webm', kind: 'VIDEO', maxBytes: 200 * 1024 * 1024 }],
]);

export const UPLOAD_URL_TTL_SECONDS = 600;
export const DOWNLOAD_URL_TTL_SECONDS = 3600;
export const MAX_MEDIA_PER_POST = 10;

export const MEDIA_KEY_PATTERN =
  /^creators\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm)$/;
