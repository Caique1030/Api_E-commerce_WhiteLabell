import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Current password is required' })
  @IsString({ message: 'The current password must be a string' })
  oldPassword: string;

  @IsNotEmpty({ message: 'The new password is mandatory' })
  @IsString({ message: 'The new password must be a string' })
  @MinLength(6, { message: 'The new password must be at least 6 characters long' })
  newPassword: string;
}
