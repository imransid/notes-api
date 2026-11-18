import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators.js';
import type { JwtPayload } from '../common/jwt-auth.guard.js';
import { CreatePostDto } from './posts.dto.js';
import { PostsService } from './posts.service.js';

// Reading posts is GET /users/:id/posts (the $lookup pipeline in UsersService).
@Controller('posts')
export class PostsController {
  constructor(private posts: PostsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePostDto) {
    return this.posts.create(user.sub, dto);
  }
}
