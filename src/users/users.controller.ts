import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../common/decorators.js';
import type { JwtPayload } from '../common/jwt-auth.guard.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.users.findById(user.sub);
  }
}
