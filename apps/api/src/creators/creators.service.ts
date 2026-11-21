import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

// Never expose bank details or the KYC provider reference here.
const OWN_SELECT = {
  id: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  bannerUrl: true,
  monthlyPriceKobo: true,
  kycStatus: true,
  createdAt: true,
  updatedAt: true,
} as const;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class CreatorsService {
  constructor(private prisma: PrismaService) {}

  private async findCreator(username: string) {
    const creator = await this.prisma.creatorProfile.findFirst({
      where: { user: { username, isBanned: false } },
      select: { id: true, userId: true, monthlyPriceKobo: true },
    });
    if (!creator) throw new NotFoundException('Creator not found');
    return creator;
  }

  async getMine(userId: string) {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select: OWN_SELECT,
    });
    if (!profile) throw new NotFoundException('Creator profile not found');
    return profile;
  }

  async updateMine(userId: string, dto: UpdateProfileDto) {
    await this.getMine(userId);
    return this.prisma.creatorProfile.update({
      where: { userId },
      data: { ...dto },
      select: OWN_SELECT,
    });
  }

  async getPublic(username: string, viewer: { id: string } | null) {
    const profile = await this.prisma.creatorProfile.findFirst({
      where: { user: { username, isBanned: false } },
      select: {
        id: true,
        userId: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        bannerUrl: true,
        monthlyPriceKobo: true,
        user: { select: { username: true } },
        _count: {
          select: {
            posts: { where: { isRemoved: false } },
            subscribers: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });
    if (!profile) throw new NotFoundException('Creator not found');

    const viewerState = {
      isOwner: false,
      isSubscribed: false,
      status: null as string | null,
      currentPeriodEnd: null as Date | null,
    };

    if (viewer) {
      viewerState.isOwner = viewer.id === profile.userId;
      const sub = await this.prisma.subscription.findUnique({
        where: {
          fanId_creatorId: { fanId: viewer.id, creatorId: profile.id },
        },
        select: { status: true, currentPeriodEnd: true },
      });
      if (sub) {
        viewerState.status = sub.status;
        viewerState.currentPeriodEnd = sub.currentPeriodEnd;
        viewerState.isSubscribed =
          (sub.status === 'ACTIVE' || sub.status === 'CANCELLED') &&
          sub.currentPeriodEnd > new Date();
      }
    }

    return {
      username: profile.user.username,
      displayName: profile.displayName,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      bannerUrl: profile.bannerUrl,
      monthlyPriceKobo: profile.monthlyPriceKobo,
      postCount: profile._count.posts,
      subscriberCount: profile._count.subscribers,
      viewer: viewerState,
    };
  }

  async list(q?: string) {
    const term = q?.trim();
    const rows = await this.prisma.creatorProfile.findMany({
      where: {
        user: { isBanned: false },
        ...(term
          ? {
              OR: [
                {
                  displayName: {
                    contains: term,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  user: {
                    username: {
                      contains: term,
                      mode: 'insensitive' as const,
                    },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        displayName: true,
        bio: true,
        avatarUrl: true,
        monthlyPriceKobo: true,
        user: { select: { username: true } },
      },
    });

    return rows.map(({ user, ...rest }) => ({
      username: user.username,
      ...rest,
    }));
  }

  // TEST ONLY: free 30-day subscription. Replaced by Paystack checkout later.
  async devSubscribe(userId: string, username: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        'Test subscriptions are disabled in production',
      );
    }
    const creator = await this.findCreator(username);
    if (creator.userId === userId) {
      throw new BadRequestException('You cannot subscribe to yourself');
    }

    const currentPeriodEnd = new Date(Date.now() + THIRTY_DAYS_MS);
    return this.prisma.subscription.upsert({
      where: {
        fanId_creatorId: { fanId: userId, creatorId: creator.id },
      },
      create: {
        fanId: userId,
        creatorId: creator.id,
        status: 'ACTIVE',
        priceKobo: creator.monthlyPriceKobo,
        currentPeriodEnd,
      },
      update: {
        status: 'ACTIVE',
        priceKobo: creator.monthlyPriceKobo,
        currentPeriodEnd,
        cancelledAt: null,
      },
      select: { status: true, currentPeriodEnd: true },
    });
  }

  // Access continues until the paid period ends.
  async cancel(userId: string, username: string) {
    const creator = await this.findCreator(username);
    const result = await this.prisma.subscription.updateMany({
      where: { fanId: userId, creatorId: creator.id, status: 'ACTIVE' },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    if (result.count === 0) {
      throw new NotFoundException('No active subscription to cancel');
    }
    return { success: true };
  }
}
