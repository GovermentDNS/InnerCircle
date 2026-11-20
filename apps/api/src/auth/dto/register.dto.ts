import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @Matches(/^[a-zA-Z0-9_]{3,20}$/, {
    message: 'username must be 3-20 letters, numbers or underscores',
  })
  username: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsOptional()
  @IsBoolean()
  asCreator?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;
}
