import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type Role = 'user' | 'admin';
export const ROLES: Role[] = ['user', 'admin'];

const normalizeInterests = (interests: string[]) => [
  ...new Set(interests.map((i) => i.trim().toLowerCase()).filter(Boolean)),
];

@Schema({
  timestamps: true,
  // Strips the hash from hydrated documents, e.g. the one returned by create().
  toJSON: {
    transform: (_doc, ret: Record<string, unknown>) => {
      delete ret.password;
      return ret;
    },
  },
})
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ type: String, enum: ROLES, default: 'user' })
  role: Role;

  // A setter (not a save hook) so it also runs on findByIdAndUpdate.
  @Prop({ type: [String], default: [], set: normalizeInterests })
  interests: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);

// Login lookup by email; unique also enforces one account per email (11000 -> 409).
UserSchema.index({ email: 1 }, { unique: true });
// Multikey: serves the leading $match of the group-by-interest pipeline.
UserSchema.index({ interests: 1 });
