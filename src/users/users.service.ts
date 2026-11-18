import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { CreateUserDto } from './users.dto.js';
import { User } from './user.schema.js';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(dto: CreateUserDto) {
    const password = await bcrypt.hash(dto.password, 10);
    try {
      return await this.userModel.create({ ...dto, password });
    } catch (err) {
      throw toConflict(err);
    }
  }

  findByEmailWithPassword(email: string) {
    return this.userModel.findOne({ email }).select('+password').lean();
  }

  async findById(id: string | Types.ObjectId) {
    const user = await this.userModel.findById(id).lean();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}

// The unique index is the source of truth; a findOne pre-check would race.
function toConflict(err: unknown) {
  return (err as { code?: number }).code === 11000
    ? new ConflictException('Email already in use')
    : err;
}
