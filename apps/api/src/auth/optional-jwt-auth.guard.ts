import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Lets anonymous visitors through; request.user is null for them.
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(_err: unknown, user: any) {
    return user || null;
  }
}
