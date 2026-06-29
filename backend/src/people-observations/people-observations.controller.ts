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
import { PeopleObservation as PeopleObservationModel } from '@prisma/client';
import { AccessTokenPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiErrorDto } from '../common/dto/api-error.dto';
import { CreatePeopleObservationDto } from './dto/create-people-observation.dto';
import { PeopleObservationQueryDto } from './dto/people-observation-query.dto';
import {
  PeopleObservationResponseDto,
  PeopleObservationsPageResponseDto,
} from './dto/people-observation-response.dto';
import { UpdatePeopleObservationDto } from './dto/update-people-observation.dto';
import {
  PeopleObservationsPage,
  PeopleObservationsService,
} from './people-observations.service';

@ApiTags('people-observations')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@Controller('people-observations')
@UseGuards(JwtAuthGuard)
export class PeopleObservationsController {
  constructor(private readonly peopleObservationsService: PeopleObservationsService) {}

  @Get()
  @ApiOperation({ summary: 'List the current user people observations' })
  @ApiOkResponse({ type: PeopleObservationsPageResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: PeopleObservationQueryDto,
  ): Promise<PeopleObservationsPage> {
    return this.peopleObservationsService.list(user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one active people observation owned by the current user' })
  @ApiOkResponse({ type: PeopleObservationResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiParam({ name: 'id', format: 'uuid' })
  getOne(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<PeopleObservationModel> {
    return this.peopleObservationsService.getOne(user.sub, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a people observation for the current user' })
  @ApiCreatedResponse({ type: PeopleObservationResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiConflictResponse({ type: ApiErrorDto })
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CreatePeopleObservationDto,
  ): Promise<PeopleObservationModel> {
    return this.peopleObservationsService.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an active people observation owned by the current user' })
  @ApiOkResponse({ type: PeopleObservationResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiParam({ name: 'id', format: 'uuid' })
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdatePeopleObservationDto,
  ): Promise<PeopleObservationModel> {
    return this.peopleObservationsService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a people observation owned by the current user' })
  @ApiOkResponse({ type: PeopleObservationResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiParam({ name: 'id', format: 'uuid' })
  remove(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<PeopleObservationModel> {
    return this.peopleObservationsService.remove(user.sub, id);
  }
}
