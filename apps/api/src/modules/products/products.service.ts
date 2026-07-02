import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organiserId: string, dto: CreateProductDto) {
    const variantsData = dto.hasSizeVariant && dto.variants?.length
      ? dto.variants.map((v) => ({ size: v.size?.trim() || null }))
      : [{ size: null }];

    return this.prisma.product.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        imageUrl: dto.imageUrl || null,
        hasSizeVariant: dto.hasSizeVariant,
        organiserId,
        variants: { create: variantsData },
      },
      include: { variants: true },
    });
  }

  async findAll(organiserId: string) {
    return this.prisma.product.findMany({
      where: { organiserId, isActive: true },
      include: { variants: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organiserId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        ticketGoodies: {
          include: { ticketType: { include: { event: { select: { id: true, title: true } } } } },
        },
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    if (product.organiserId !== organiserId) throw new ForbiddenException('Not your product');

    return product;
  }

  async update(id: string, organiserId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.organiserId !== organiserId) throw new ForbiddenException('Not your product');

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.description !== undefined) updateData.description = dto.description?.trim() || null;
    if (dto.imageUrl !== undefined) updateData.imageUrl = dto.imageUrl || null;
    if (dto.hasSizeVariant !== undefined) updateData.hasSizeVariant = dto.hasSizeVariant;

    if (dto.variants !== undefined) {
      await this.prisma.productVariant.deleteMany({ where: { productId: id } });

      const hasSizes = dto.hasSizeVariant ?? product.hasSizeVariant;
      const newVariants = hasSizes && dto.variants.length
        ? dto.variants.map((v) => ({ productId: id, size: v.size?.trim() || null }))
        : [{ productId: id, size: null as string | null }];

      await this.prisma.productVariant.createMany({ data: newVariants });
    }

    return this.prisma.product.update({
      where: { id },
      data: updateData,
      include: { variants: true },
    });
  }

  async remove(id: string, organiserId: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.organiserId !== organiserId) throw new ForbiddenException('Not your product');

    await this.prisma.product.update({ where: { id }, data: { isActive: false } });
    return { message: 'Product deactivated' };
  }
}
