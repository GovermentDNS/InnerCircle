import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

type AuthUser = { id: string; role: string };

function pageSize(raw?: string) {
  const n = parseInt(raw ?? '20', 10);
  if (Number.isNaN(n)) return 20;
  return Math.min(Math.max(n, 1), 50);
}

@Controller()
export class PostsController {
  constructor(private posts: PostsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR')
  @Post('posts')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePostDto) {
    return this.posts.create(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('feed')
  feed(
    @CurrentUser() user: AuthUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.posts.feed(user.id, cursor, pageSize(limit));
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('creators/:username/posts')
  byCreator(
    @Param('username') username: string,
    @CurrentUser() user: AuthUser | null,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.posts.listByCreator(username, user, cursor, pageSize(limit));
  }

  @UseGuards(JwtAuthGuard)
  @Delete('posts/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.posts.remove(user, id);
  }
}
