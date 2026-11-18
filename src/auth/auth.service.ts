import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import type { JwtPayload } from '../common/jwt-auth.guard.js';
import type { Role } from '../users/user.schema.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto, RegisterDto } from './auth.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.users.create(dto);
    return this.withToken(user);
  }

  async login({ email, password }: LoginDto) {
    const found = await this.users.findByEmailWithPassword(email);
    // Same error for unknown email and wrong password: no account enumeration.
    if (!found || !(await bcrypt.compare(password, found.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const { password: _hash, ...user } = found;
    return this.withToken(user);
  }

  private async withToken<T extends { _id: Types.ObjectId; role: Role }>(
    user: T,
  ) {
    const payload: JwtPayload = { sub: user._id.toString(), role: user.role };
    return { accessToken: await this.jwt.signAsync(payload), user };
  }
}
