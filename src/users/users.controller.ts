import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { CurrentUser, Roles } from '../common/decorators.js';
import type { JwtPayload } from '../common/jwt-auth.guard.js';
import { PaginationQueryDto } from '../common/pagination.dto.js';
import { CreateUserDto, UpdateUserDto } from './users.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.users.findById(user.sub);
  }

  @Get('by-interest')
  @Roles('admin')
  groupByInterest(@Query() query: PaginationQueryDto) {
    return this.users.groupByInterest(query);
  }

  @Get()
  @Roles('admin')
  findAll(@Query() query: PaginationQueryDto) {
    return this.users.findAll(query);
  }

  @Post()
  @Roles('admin')
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Get(':id')
  @Roles('admin')
  findOne(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) {
    return this.users.findById(id);
  }

  @Get(':id/posts')
  findPosts(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Query() query: PaginationQueryDto,
  ) {
    return this.users.findPosts(id, query);
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  remove(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.remove(id, user.sub);
  }
}
