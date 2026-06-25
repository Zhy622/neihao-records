import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Record as RecordModel } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { AccessTokenPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiErrorDto } from '../common/dto/api-error.dto';
import { CreateRecordDto } from './dto/create-record.dto';
import { RecordQueryDto } from './dto/record-query.dto';
import { RecordResponseDto, RecordsPageResponseDto } from './dto/record-response.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { RecordsPage, RecordsService } from './records.service';

@ApiTags('records')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@Controller('records')
@UseGuards(JwtAuthGuard)
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @Get()
  @ApiOperation({ summary: 'List the current user records' })
  @ApiOkResponse({ type: RecordsPageResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: RecordQueryDto,
  ): Promise<RecordsPage> {
    return this.recordsService.list(user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one active record owned by the current user' })
  @ApiOkResponse({ type: RecordResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiParam({ name: 'id', format: 'uuid' })
  getOne(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<RecordModel> {
    return this.recordsService.getOne(user.sub, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a record for the current user' })
  @ApiCreatedResponse({ type: RecordResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiConflictResponse({ type: ApiErrorDto })
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CreateRecordDto,
  ): Promise<RecordModel> {
    return this.recordsService.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an active record owned by the current user' })
  @ApiOkResponse({ type: RecordResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiParam({ name: 'id', format: 'uuid' })
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateRecordDto,
  ): Promise<RecordModel> {
    return this.recordsService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a record owned by the current user' })
  @ApiOkResponse({ type: RecordResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiParam({ name: 'id', format: 'uuid' })
  remove(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<RecordModel> {
    return this.recordsService.remove(user.sub, id);
  }
}
