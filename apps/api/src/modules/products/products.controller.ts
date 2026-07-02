import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@thoovitickets/shared';

@Controller('products')
@Roles(UserRole.ORGANISER)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@CurrentUser('id') organiserId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(organiserId, dto);
  }

  @Get()
  findAll(@CurrentUser('id') organiserId: string) {
    return this.productsService.findAll(organiserId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('id') organiserId: string) {
    return this.productsService.findOne(id, organiserId);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(@Param('id') id: string, @CurrentUser('id') organiserId: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, organiserId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @CurrentUser('id') organiserId: string) {
    return this.productsService.remove(id, organiserId);
  }
}
