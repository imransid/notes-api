import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';
import { User } from '../users/user.schema.js';

@Schema({ timestamps: true })
export class Note {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: User.name, required: true })
  owner: Types.ObjectId;
}

export const NoteSchema = SchemaFactory.createForClass(Note);

// "My notes": equality on owner, then newest first by _id with no in-memory sort.
// Also serves deleteMany({ owner }) when a user is removed.
NoteSchema.index({ owner: 1, _id: -1 });
