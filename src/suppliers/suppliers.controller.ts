import { Controller, Get, Body, Param, UseGuards } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.suppliersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/products')
  fetchProductsFromSupplier(@Param('id') id: string) {
    return this.suppliersService.fetchProductsFromSupplier(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/products/:productId')
  fetchProductByIdFromSupplier(
    @Param('id') id: string,
    @Param('productId') productId: string,
  ) {
    return this.suppliersService.fetchProductByIdFromSupplier(id, productId);
  }
}
