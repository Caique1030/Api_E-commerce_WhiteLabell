import { PartialType } from '@nestjs/mapped-types';
import { CreateSupplierDto } from './create-supplier.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateDto extends PartialType(CreateSupplierDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;s
}