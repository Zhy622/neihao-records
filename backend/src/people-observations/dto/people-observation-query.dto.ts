import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PeopleObservationEmotion } from '@prisma/client';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class PeopleObservationQueryDto {
  @ApiPropertyOptional({ enum: PeopleObservationEmotion, enumName: 'PeopleObservationEmotion' })
  @IsOptional()
  @IsEnum(PeopleObservationEmotion)
  emotion?: PeopleObservationEmotion;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ format: 'date-time', description: 'Only return observations updated after this time.' })
  @IsOptional()
  @IsISO8601({ strict: true })
  updatedSince?: string;

  @ApiPropertyOptional({ enum: ['true', 'false'], default: 'false' })
  @IsOptional()
  @IsIn(['true', 'false'])
  includeDeleted?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
