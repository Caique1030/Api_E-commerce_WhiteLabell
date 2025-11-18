import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'A senha atual é obrigatória' })
  @IsString({ message: 'A senha atual deve ser uma string' })
  oldPassword: string;

  @IsNotEmpty({ message: 'A nova senha é obrigatória' })
  @IsString({ message: 'A nova senha deve ser uma string' })
  @MinLength(6, { message: 'A nova senha deve ter no mínimo 6 caracteres' })
  newPassword: string;
}
