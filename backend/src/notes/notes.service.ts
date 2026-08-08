import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Note, Prisma, RecordSyncStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { NoteQueryDto } from './dto/note-query.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

export type NotesPage = { notes: Note[]; total: number; limit: number; offset: number };

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: NoteQueryDto): Promise<NotesPage> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const where: Prisma.NoteWhereInput = {
      userId,
      ...(query.includeDeleted === 'true' ? {} : { syncStatus: RecordSyncStatus.ACTIVE }),
      ...(query.updatedSince ? { updatedAt: { gt: new Date(query.updatedSince) } } : {}),
      ...(query.category ? { categories: { has: query.category } } : {}),
      ...(query.search?.trim() ? { content: { contains: query.search.trim(), mode: 'insensitive' } } : {}),
    };
    const [notes, total] = await this.prisma.$transaction([
      this.prisma.note.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit, skip: offset }),
      this.prisma.note.count({ where }),
    ]);
    return { notes, total, limit, offset };
  }

  getOne(userId: string, id: string) {
    return this.findOwnedNote(userId, id, false);
  }

  async create(userId: string, dto: CreateNoteDto) {
    try {
      return await this.prisma.note.create({
        data: {
          userId,
          clientId: dto.clientId,
          content: dto.content,
          noteType: dto.noteType,
          emotions: dto.emotions,
          categories: dto.categories,
          createdAt: dto.createdAt ? new Date(dto.createdAt) : undefined,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A note with this clientId already exists.');
      }
      throw error;
    }
  }

  async update(userId: string, id: string, dto: UpdateNoteDto) {
    await this.findOwnedNote(userId, id, false);
    return this.prisma.note.update({
      where: { id },
      data: { content: dto.content, noteType: dto.noteType, emotions: dto.emotions ? { set: dto.emotions } : undefined, categories: dto.categories ? { set: dto.categories } : undefined },
    });
  }

  async remove(userId: string, id: string) {
    const note = await this.findOwnedNote(userId, id, true);
    if (note.syncStatus === RecordSyncStatus.DELETED) return note;
    return this.prisma.note.update({ where: { id }, data: { syncStatus: RecordSyncStatus.DELETED, deletedAt: new Date() } });
  }

  private async findOwnedNote(userId: string, id: string, includeDeleted: boolean) {
    const note = await this.prisma.note.findFirst({
      where: { userId, id, ...(includeDeleted ? {} : { syncStatus: RecordSyncStatus.ACTIVE }) },
    });
    if (!note) throw new NotFoundException('Note not found.');
    return note;
  }
}
