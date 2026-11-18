import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { JwtPayload } from '../common/jwt-auth.guard.js';
import { paginate, PaginationQueryDto } from '../common/pagination.dto.js';
import { CreateNoteDto, UpdateNoteDto } from './notes.dto.js';
import { Note } from './note.schema.js';

@Injectable()
export class NotesService {
  constructor(@InjectModel(Note.name) private noteModel: Model<Note>) {}

  create(owner: string, dto: CreateNoteDto) {
    return this.noteModel.create({ ...dto, owner });
  }

  async findMine(owner: string, query: PaginationQueryDto) {
    const { page, limit } = query;
    const notes = await this.noteModel
      .find({ owner })
      .sort({ _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit + 1)
      .lean();
    return paginate(notes, query);
  }

  // Walks the built-in _id index backwards; populate is an $in on users._id.
  async findAll(query: PaginationQueryDto) {
    const { page, limit } = query;
    const notes = await this.noteModel
      .find()
      .sort({ _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit + 1)
      .populate('owner', 'name email')
      .lean();
    return paginate(notes, query);
  }

  async findOne(id: Types.ObjectId, user: JwtPayload) {
    const filter =
      user.role === 'admin' ? { _id: id } : { _id: id, owner: user.sub };
    const note = await this.noteModel.findOne(filter).lean();
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  // Ownership is part of the filter, so another user's note is simply "not found".
  async update(id: Types.ObjectId, owner: string, dto: UpdateNoteDto) {
    const note = await this.noteModel
      .findOneAndUpdate({ _id: id, owner }, dto, { returnDocument: 'after' })
      .lean();
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  async remove(id: Types.ObjectId, owner: string) {
    const { deletedCount } = await this.noteModel.deleteOne({ _id: id, owner });
    if (!deletedCount) throw new NotFoundException('Note not found');
  }
}
