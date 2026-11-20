import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';

type Viewer = { id: string; role: string } | null;

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

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

  private shape(
    p: {
      id: string;
      caption: string | null;
      visibility: string;
      createdAt: Date;
    },
    unlocked: boolean,
  ) {
    const locked = p.visibility === 'SUBSCRIBERS' && !unlocked;
    return {
      id: p.id,
      visibility: p.visibility,
      createdAt: p.createdAt,
      locked,
      caption: locked ? null : p.caption,
    };
  }

  async create(userId: string, dto: CreatePostDto) {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) throw new ForbiddenException('Creator profile required');

    const post = await this.prisma.post.create({
      data: {
        creatorId: profile.id,
        caption: dto.caption,
        visibility: dto.visibility ?? 'SUBSCRIBERS',
      },
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
    });

    const page = posts.slice(0, limit);
    return {
      items: page.map((p) => this.shape(p, unlocked)),
      nextCursor:
        posts.length > limit ? page[page.length - 1].id : null,
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
        creator: {
          select: {
            displayName: true,
            user: { select: { username: true } },
          },
        },
      },
    });

    const page = posts.slice(0, limit);
    return {
      items: page.map((p) => ({
        ...this.shape(p, true),
        creator: {
          username: p.creator.user.username,
          displayName: p.creator.displayName,
        },
      })),
      nextCursor:
        posts.length > limit ? page[page.length - 1].id : null,
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
