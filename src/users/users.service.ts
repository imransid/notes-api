import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { paginate, PaginationQueryDto } from '../common/pagination.dto.js';
import { NotesService } from '../notes/notes.service.js';
import { Post } from '../posts/post.schema.js';
import { PostsService } from '../posts/posts.service.js';
import { CreateUserDto, UpdateUserDto } from './users.dto.js';
import { User } from './user.schema.js';

export interface InterestGroup {
  _id: string;
  count: number;
  users: { _id: Types.ObjectId; name: string; email: string }[];
}

export interface UserWithPosts {
  _id: Types.ObjectId;
  name: string;
  posts: (Post & { _id: Types.ObjectId })[];
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private notes: NotesService,
    private posts: PostsService,
  ) {}

  async create(dto: CreateUserDto) {
    const password = await bcrypt.hash(dto.password, 10);
    return this.userModel
      .create({ ...dto, password })
      .catch(rethrowDuplicateEmail);
  }

  async findAll(query: PaginationQueryDto) {
    const { page, limit } = query;
    const users = await this.userModel
      .find()
      .sort({ _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit + 1)
      .lean();
    return paginate(users, query);
  }

  findByEmailWithPassword(email: string) {
    return this.userModel.findOne({ email }).select('+password').lean();
  }

  async findById(id: string | Types.ObjectId) {
    const user = await this.userModel.findById(id).lean();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: Types.ObjectId, dto: UpdateUserDto) {
    const update = dto.password
      ? { ...dto, password: await bcrypt.hash(dto.password, 10) }
      : dto;
    const user = await this.userModel
      .findByIdAndUpdate(id, update, { returnDocument: 'after' })
      .lean()
      .catch(rethrowDuplicateEmail);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async remove(id: Types.ObjectId, currentUserId: string) {
    if (id.equals(currentUserId)) {
      throw new BadRequestException('You cannot delete your own account');
    }
    const { deletedCount } = await this.userModel.deleteOne({ _id: id });
    if (!deletedCount) throw new NotFoundException('User not found');
    await Promise.all([
      this.notes.deleteByOwner(id),
      this.posts.deleteByAuthor(id),
    ]);
  }

  async groupByInterest(query: PaginationQueryDto) {
    const { page, limit } = query;
    const groups = await this.userModel.aggregate<InterestGroup>([
      // Users with at least one interest. Only this stage can use an index
      // (the multikey { interests: 1 }); $unwind and $group run in memory.
      { $match: { interests: { $type: 'string' } } },
      { $unwind: '$interests' },
      {
        $group: {
          _id: '$interests',
          count: { $sum: 1 },
          users: { $push: { _id: '$_id', name: '$name', email: '$email' } },
        },
      },
      // _id breaks ties so pages are stable.
      { $sort: { count: -1, _id: 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit + 1 },
    ]);
    return paginate(groups, query);
  }

  async findPosts(id: Types.ObjectId, query: PaginationQueryDto) {
    const { page, limit } = query;
    const [user] = await this.userModel.aggregate<UserWithPosts>([
      // _id index. aggregate() doesn't cast, so id must already be an ObjectId.
      { $match: { _id: id } },
      { $project: { name: 1 } },
      {
        // localField/foreignField plus pipeline needs MongoDB 5.0+.
        // { author: 1, _id: -1 } serves both the author equality and the sort.
        $lookup: {
          from: 'posts',
          localField: '_id',
          foreignField: 'author',
          pipeline: [
            { $sort: { _id: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit + 1 },
          ],
          as: 'posts',
        },
      },
    ]);
    if (!user) throw new NotFoundException('User not found');
    const { posts, ...rest } = user;
    return { user: rest, ...paginate(posts, query) };
  }
}

// The unique index is the source of truth; a findOne pre-check would race.
function rethrowDuplicateEmail(err: unknown): never {
  if ((err as { code?: number }).code === 11000) {
    throw new ConflictException('Email already in use');
  }
  throw err;
}
