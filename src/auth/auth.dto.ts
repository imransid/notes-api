import { OmitType } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { CreateUserDto } from '../users/users.dto.js';

// No role field: whitelist strips it, so self-registration is always 'user'.
export class RegisterDto extends OmitType(CreateUserDto, ['role']) {}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
