import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Record as RecordModel, RecordSyncStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { RecordQueryDto } from './dto/record-query.dto';
import { UpdateRecordDto } from './dto/update-record.dto';

export type RecordsPage = {
  records: RecordModel[];
  total: number;
  limit: number;
  offset: number;
};

@Injectable()
export class RecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: RecordQueryDto): Promise<RecordsPage> {
    const limit = query.limit ?? 10;
    const offset = query.offset ?? 0;
    const where = this.buildListWhere(userId, query);
    const [records, total] = await this.prisma.$transaction([
      this.prisma.record.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.record.count({ where }),
    ]);

    return {
      records,
      total,
      limit,
      offset,
    };
  }

  async getOne(userId: string, id: string): Promise<RecordModel> {
    return this.findOwnedRecord(userId, id, false);
  }

  async create(userId: string, dto: CreateRecordDto): Promise<RecordModel> {
    try {
      return await this.prisma.record.create({
        data: {
          userId,
          clientId: dto.clientId,
          title: dto.title,
          category: dto.category,
          emotions: dto.emotions,
          emotionIntensity: dto.emotionIntensity,
          decisionDifficulty: dto.decisionDifficulty,
          timeCost: dto.timeCost,
          thoughts: dto.thoughts ?? '',
          finalDecision: dto.finalDecision ?? '',
          worthIt: dto.worthIt,
          createdAt: dto.createdAt ? new Date(dto.createdAt) : undefined,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('A record with this clientId already exists.');
      }

      throw error;
    }
  }

  async update(userId: string, id: string, dto: UpdateRecordDto): Promise<RecordModel> {
    await this.findOwnedRecord(userId, id, false);

    return this.prisma.record.update({
      where: { id },
      data: {
        title: dto.title,
        category: dto.category,
        emotions: dto.emotions ? { set: dto.emotions } : undefined,
        emotionIntensity: dto.emotionIntensity,
        decisionDifficulty: dto.decisionDifficulty,
        timeCost: dto.timeCost,
        thoughts: dto.thoughts,
        finalDecision: dto.finalDecision,
        worthIt: dto.worthIt,
      },
    });
  }

  async remove(userId: string, id: string): Promise<RecordModel> {
    const record = await this.findOwnedRecord(userId, id, true);

    if (record.syncStatus === RecordSyncStatus.DELETED) {
      return record;
    }

    return this.prisma.record.update({
      where: { id },
      data: {
        syncStatus: RecordSyncStatus.DELETED,
        deletedAt: new Date(),
      },
    });
  }

  private buildListWhere(userId: string, query: RecordQueryDto): Prisma.RecordWhereInput {
    const search = query.search?.trim();

    return {
      userId,
      ...(query.includeDeleted === 'true'
        ? {}
        : { syncStatus: RecordSyncStatus.ACTIVE }),
      ...(query.category ? { category: query.category } : {}),
      ...(query.emotion ? { emotions: { has: query.emotion } } : {}),
      ...(query.updatedSince
        ? { updatedAt: { gt: new Date(query.updatedSince) } }
        : {}),
      ...(query.createdSince
        ? { createdAt: { gte: new Date(query.createdSince) } }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { thoughts: { contains: search, mode: 'insensitive' } },
              { finalDecision: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private async findOwnedRecord(
    userId: string,
    id: string,
    includeDeleted: boolean,
  ): Promise<RecordModel> {
    const record = await this.prisma.record.findFirst({
      where: {
        id,
        userId,
        ...(includeDeleted ? {} : { syncStatus: RecordSyncStatus.ACTIVE }),
      },
    });

    if (!record) {
      throw new NotFoundException('Record not found.');
    }

    return record;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
