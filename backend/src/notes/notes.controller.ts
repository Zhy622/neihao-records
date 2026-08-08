import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Note } from '@prisma/client';
import { AccessTokenPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiErrorDto } from '../common/dto/api-error.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { NoteQueryDto } from './dto/note-query.dto';
import { NoteResponseDto, NotesPageResponseDto } from './dto/note-response.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NotesPage, NotesService } from './notes.service';

@ApiTags('notes')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  @ApiOperation({ summary: 'List the current user notes' })
  @ApiOkResponse({ type: NotesPageResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  list(@CurrentUser() user: AccessTokenPayload, @Query() query: NoteQueryDto): Promise<NotesPage> {
    return this.notesService.list(user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one active note owned by the current user' })
  @ApiOkResponse({ type: NoteResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiParam({ name: 'id', format: 'uuid' })
  getOne(@CurrentUser() user: AccessTokenPayload, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<Note> {
    return this.notesService.getOne(user.sub, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a note for the current user' })
  @ApiCreatedResponse({ type: NoteResponseDto })
  @ApiConflictResponse({ type: ApiErrorDto })
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateNoteDto): Promise<Note> {
    return this.notesService.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an active note owned by the current user' })
  @ApiOkResponse({ type: NoteResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  update(@CurrentUser() user: AccessTokenPayload, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: UpdateNoteDto): Promise<Note> {
    return this.notesService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a note owned by the current user' })
  @ApiOkResponse({ type: NoteResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  remove(@CurrentUser() user: AccessTokenPayload, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<Note> {
    return this.notesService.remove(user.sub, id);
  }
}
