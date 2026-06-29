import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  PeopleObservation as PeopleObservationModel,
  Prisma,
  RecordSyncStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePeopleObservationDto } from './dto/create-people-observation.dto';
import { PeopleObservationQueryDto } from './dto/people-observation-query.dto';
import { UpdatePeopleObservationDto } from './dto/update-people-observation.dto';

export type PeopleObservationsPage = {
  peopleObservations: PeopleObservationModel[];
  total: number;
  limit: number;
  offset: number;
};

@Injectable()
export class PeopleObservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    query: PeopleObservationQueryDto,
  ): Promise<PeopleObservationsPage> {
    const limit = query.limit ?? 100;
    const offset = query.offset ?? 0;
    const where = this.buildListWhere(userId, query);
    const [peopleObservations, total] = await this.prisma.$transaction([
      this.prisma.peopleObservation.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.peopleObservation.count({ where }),
    ]);

    return {
      peopleObservations,
      total,
      limit,
      offset,
    };
  }

  async getOne(userId: string, id: string): Promise<PeopleObservationModel> {
    return this.findOwnedPeopleObservation(userId, id, false);
  }

  async create(
    userId: string,
    dto: CreatePeopleObservationDto,
  ): Promise<PeopleObservationModel> {
    try {
      return await this.prisma.peopleObservation.create({
        data: {
          userId,
          clientId: dto.clientId,
          alias: dto.alias,
          emotions: dto.emotions,
          triggerScene: dto.triggerScene ?? '',
          contemptPoints: dto.contemptPoints ?? '',
          inferiorityOrEnvyPoints: dto.inferiorityOrEnvyPoints ?? '',
          otherStrengths: dto.otherStrengths ?? '',
          myStrengths: dto.myStrengths ?? '',
          personDefinition: dto.personDefinition ?? '',
          learningAction: dto.learningAction ?? '',
          createdAt: dto.createdAt ? new Date(dto.createdAt) : undefined,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('A people observation with this clientId already exists.');
      }

      throw error;
    }
  }

  async update(
    userId: string,
    id: string,
    dto: UpdatePeopleObservationDto,
  ): Promise<PeopleObservationModel> {
    await this.findOwnedPeopleObservation(userId, id, false);

    return this.prisma.peopleObservation.update({
      where: { id },
      data: {
        alias: dto.alias,
        emotions: dto.emotions ? { set: dto.emotions } : undefined,
        triggerScene: dto.triggerScene,
        contemptPoints: dto.contemptPoints,
        inferiorityOrEnvyPoints: dto.inferiorityOrEnvyPoints,
        otherStrengths: dto.otherStrengths,
        myStrengths: dto.myStrengths,
        personDefinition: dto.personDefinition,
        learningAction: dto.learningAction,
      },
    });
  }

  async remove(userId: string, id: string): Promise<PeopleObservationModel> {
    const peopleObservation = await this.findOwnedPeopleObservation(userId, id, true);

    if (peopleObservation.syncStatus === RecordSyncStatus.DELETED) {
      return peopleObservation;
    }

    return this.prisma.peopleObservation.update({
      where: { id },
      data: {
        syncStatus: RecordSyncStatus.DELETED,
        deletedAt: new Date(),
      },
    });
  }

  private buildListWhere(
    userId: string,
    query: PeopleObservationQueryDto,
  ): Prisma.PeopleObservationWhereInput {
    const search = query.search?.trim();

    return {
      userId,
      ...(query.includeDeleted === 'true'
        ? {}
        : { syncStatus: RecordSyncStatus.ACTIVE }),
      ...(query.emotion ? { emotions: { has: query.emotion } } : {}),
      ...(query.updatedSince
        ? { updatedAt: { gt: new Date(query.updatedSince) } }
        : {}),
      ...(search
        ? {
            OR: [
              { alias: { contains: search, mode: 'insensitive' } },
              { triggerScene: { contains: search, mode: 'insensitive' } },
              { contemptPoints: { contains: search, mode: 'insensitive' } },
              { inferiorityOrEnvyPoints: { contains: search, mode: 'insensitive' } },
              { otherStrengths: { contains: search, mode: 'insensitive' } },
              { myStrengths: { contains: search, mode: 'insensitive' } },
              { personDefinition: { contains: search, mode: 'insensitive' } },
              { learningAction: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private async findOwnedPeopleObservation(
    userId: string,
    id: string,
    includeDeleted: boolean,
  ): Promise<PeopleObservationModel> {
    const peopleObservation = await this.prisma.peopleObservation.findFirst({
      where: {
        id,
        userId,
        ...(includeDeleted ? {} : { syncStatus: RecordSyncStatus.ACTIVE }),
      },
    });

    if (!peopleObservation) {
      throw new NotFoundException('People observation not found.');
    }

    return peopleObservation;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
