import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'neihao-records-backend',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('db')
  async getDatabaseHealth() {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: 'ok',
      database: 'reachable',
      timestamp: new Date().toISOString(),
    };
  }
}
