import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('content')
export class ContentController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get(':slug')
  async getContentPage(
    @Param('slug') slug: string,
    @Query('audience') audience?: string,
  ) {
    const targetAudience = audience || 'customer';

    let page = await this.prisma.contentPage.findUnique({
      where: { slug_audience: { slug, audience: targetAudience } },
    });

    if (!page) {
      page = await this.prisma.contentPage.findUnique({
        where: { slug_audience: { slug, audience: 'all' } },
      });
    }

    if (!page || !page.isActive) throw new NotFoundException('Page not found');

    return { title: page.title, content: page.content, updatedAt: page.updatedAt };
  }
}
