import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { CreatePostDto } from './dto/create-post.dto';

type Viewer = { id: string; role: string } | null;

type PostRow = {
  id: string;
  caption: string | null;
  visibility: string;
  createdAt: Date;
  media: {
    id: string;
    type: string;
    mimeType: string;
    storageKey: string;
  }[];
};

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private media: MediaService,
  ) {}

  // A cancelled subscription keeps access until the paid period ends.
  private async hasAccess(
    viewer: Viewer,
    creatorProfileId: string,
    creatorUserId: string,
  ) {
    if (!viewer) return false;
    if (viewer.id === creatorUserId) return true;
    if (viewer.role === 'ADMIN' || viewer.role === 'MODERATOR') return true;

    const sub = await this.prisma.subscription.findFirst({
      where: {
        fanId: viewer.id,
        creatorId: creatorProfileId,
        status: { in: ['ACTIVE', 'CANCELLED'] },
        currentPeriodEnd: { gt: new Date() },
      },
      select: { id: true },
    });
    return !!sub;
  }

  // Locked posts never include a caption or media links.
  private async shape(p: PostRow, unlocked: boolean) {
    const locked = p.visibility === 'SUBSCRIBERS' && !unlocked;
    const media = locked
      ? []
      : await Promise.all(
          p.media.map(async (m) => ({
            id: m.id,
            type: m.type,
            mimeType: m.mimeType,
            url: await this.media.urlFor(m.storageKey),
          })),
        );

    return {
      id: p.id,
      visibility: p.visibility,
      createdAt: p.createdAt,
      locked,
      caption: locked ? null : p.caption,
      mediaCount: p.media.length,
      media,
    };
  }

  async create(userId: string, dto: CreatePostDto) {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) throw new ForbiddenException('Creator profile required');

    const keys = Array.from(new Set(dto.mediaKeys ?? []));
    const caption = dto.caption?.trim() || null;
    if (!caption && keys.length === 0) {
      throw new BadRequestException('A post needs a caption or media');
    }

    const files = keys.length
      ? await this.media.verifyUploads(profile.id, keys)
      : [];

    const post = await this.prisma.post.create({
      data: {
        creatorId: profile.id,
        caption,
        visibility: dto.visibility ?? 'SUBSCRIBERS',
        media: {
          create: files.map((f) => ({
            type: f.type,
            storageKey: f.storageKey,
            mimeType: f.mimeType,
            sizeBytes: f.sizeBytes,
          })),
        },
      },
      include: { media: { orderBy: { createdAt: 'asc' } } },
    });
    return this.shape(post, true);
  }

  async listByCreator(
    username: string,
    viewer: Viewer,
    cursor: string | undefined,
    limit: number,
  ) {
    const creator = await this.prisma.creatorProfile.findFirst({
      where: { user: { username, isBanned: false } },
      select: { id: true, userId: true },
    });
    if (!creator) throw new NotFoundException('Creator not found');

    const unlocked = await this.hasAccess(viewer, creator.id, creator.userId);

    const posts = await this.prisma.post.findMany({
      where: { creatorId: creator.id, isRemoved: false },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { media: { orderBy: { createdAt: 'asc' } } },
    });

    const page = posts.slice(0, limit);
    return {
      items: await Promise.all(page.map((p) => this.shape(p, unlocked))),
      nextCursor: posts.length > limit ? page[page.length - 1].id : null,
    };
  }

  async feed(userId: string, cursor: string | undefined, limit: number) {
    const posts = await this.prisma.post.findMany({
      where: {
        isRemoved: false,
        creator: {
          subscribers: {
            some: {
              fanId: userId,
              status: { in: ['ACTIVE', 'CANCELLED'] },
              currentPeriodEnd: { gt: new Date() },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        media: { orderBy: { createdAt: 'asc' } },
        creator: {
          select: {
            displayName: true,
            user: { select: { username: true } },
          },
        },
      },
    });

    const page = posts.slice(0, limit);
    const items = await Promise.all(
      page.map(async (p) => ({
        ...(await this.shape(p, true)),
        creator: {
          username: p.creator.user.username,
          displayName: p.creator.displayName,
        },
      })),
    );
    return {
      items,
      nextCursor: posts.length > limit ? page[page.length - 1].id : null,
    };
  }

  async remove(user: { id: string; role: string }, id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: { creator: { select: { userId: true } } },
    });
    if (!post || post.isRemoved) throw new NotFoundException('Post not found');

    const isOwner = post.creator.userId === user.id;
    const isStaff = user.role === 'ADMIN' || user.role === 'MODERATOR';
    if (!isOwner && !isStaff) throw new ForbiddenException();

    await this.prisma.post.update({
      where: { id },
      data: { isRemoved: true },
    });
    return { success: true };
  }
}
