import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreatorsService } from './creators.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

type AuthUser = { id: string; role: string };

@Controller('creators')
export class CreatorsController {
  constructor(private creators: CreatorsService) {}

  @Get()
  list(@Query('q') q?: string) {
    return this.creators.list(q);
  }

  // "me" routes must stay above ":username"
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR')
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.creators.getMine(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR')
  @Patch('me')
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.creators.updateMine(user.id, dto);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':username')
  profile(
    @Param('username') username: string,
    @CurrentUser() user: AuthUser | null,
  ) {
    return this.creators.getPublic(username, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':username/subscribe-dev')
  subscribeDev(
    @CurrentUser() user: AuthUser,
    @Param('username') username: string,
  ) {
    return this.creators.devSubscribe(user.id, username);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':username/unsubscribe')
  unsubscribe(
    @CurrentUser() user: AuthUser,
    @Param('username') username: string,
  ) {
    return this.creators.cancel(user.id, username);
  }
}
