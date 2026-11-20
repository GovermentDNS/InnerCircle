import { Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class CreatorsService {
  constructor(private prisma: PrismaService) {}

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

  async getPublic(username: string) {
    const profile = await this.prisma.creatorProfile.findFirst({
      where: { user: { username, isBanned: false } },
      select: {
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

    const { user, _count, ...rest } = profile;
    return {
      username: user.username,
      ...rest,
      postCount: _count.posts,
      subscriberCount: _count.subscribers,
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
}
