import { Transform, Type } from 'class-transformer';
import { Category, Emotion } from '@prisma/client';
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

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class RecordQueryDto {
  @ApiPropertyOptional({ enum: Category, enumName: 'Category' })
  @IsOptional()
  @IsEnum(Category)
  category?: Category;

  @ApiPropertyOptional({ enum: Emotion, enumName: 'Emotion' })
  @IsOptional()
  @IsEnum(Emotion)
  emotion?: Emotion;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ format: 'date-time', description: 'Only return records updated after this time.' })
  @IsOptional()
  @IsISO8601({ strict: true })
  updatedSince?: string;

  @ApiPropertyOptional({ format: 'date-time', description: 'Only return records created after this time.' })
  @IsOptional()
  @IsISO8601({ strict: true })
  createdSince?: string;

  @ApiPropertyOptional({ enum: ['true', 'false'], default: 'false' })
  @IsOptional()
  @IsIn(['true', 'false'])
  includeDeleted?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 10 })
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
