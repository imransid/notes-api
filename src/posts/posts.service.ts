import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreatePostDto } from './posts.dto.js';
import { Post } from './post.schema.js';

@Injectable()
export class PostsService {
  constructor(@InjectModel(Post.name) private postModel: Model<Post>) {}

  create(author: string, dto: CreatePostDto) {
    return this.postModel.create({ ...dto, author });
  }

  deleteByAuthor(author: Types.ObjectId) {
    return this.postModel.deleteMany({ author });
  }
}
