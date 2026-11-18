import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';
import { User } from '../users/user.schema.js';

@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: User.name, required: true })
  author: Types.ObjectId;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// The user-posts $lookup: equality on foreignField author, then newest first by _id.
// Also serves deleteMany({ author }) when a user is removed.
PostSchema.index({ author: 1, _id: -1 });
