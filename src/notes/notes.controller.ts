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
import { CreateNoteDto, UpdateNoteDto } from './notes.dto.js';
import { NotesService } from './notes.service.js';

@Controller('notes')
export class NotesController {
  constructor(private notes: NotesService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateNoteDto) {
    return this.notes.create(user.sub, dto);
  }

  @Get()
  findMine(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationQueryDto,
  ) {
    return this.notes.findMine(user.sub, query);
  }

  @Get('all')
  @Roles('admin')
  findAll(@Query() query: PaginationQueryDto) {
    return this.notes.findAll(query);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notes.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notes.update(id, user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notes.remove(id, user.sub);
  }
}
