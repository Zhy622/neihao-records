import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Category, Emotion, TimeCost, WorthIt } from '@prisma/client';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateRecordDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 100, description: 'Stable client-generated ID.' })
  @IsOptional()
  @ApiProperty({ minLength: 1, maxLength: 200, example: 'Should I accept this task?' })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  clientId?: string;

  @Transform(trim)
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiProperty({ enum: Category, enumName: 'Category' })
  @IsEnum(Category)
  category!: Category;

  @ApiProperty({ enum: Emotion, enumName: 'Emotion', isArray: true })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(7)
  @IsEnum(Emotion, { each: true })
  emotions!: Emotion[];

  @ApiProperty({ minimum: 1, maximum: 10, example: 6 })
  @IsInt()
  @Min(1)
  @Max(10)
  emotionIntensity!: number;

  @ApiProperty({ minimum: 1, maximum: 10, example: 7 })
  @IsInt()
  @Min(1)
  @Max(10)
  decisionDifficulty!: number;

  @ApiProperty({ enum: TimeCost, enumName: 'TimeCost' })
  @IsEnum(TimeCost)
  timeCost!: TimeCost;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  thoughts?: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  finalDecision?: string;

  @ApiProperty({ enum: WorthIt, enumName: 'WorthIt' })
  @IsEnum(WorthIt)
  worthIt!: WorthIt;

  @ApiPropertyOptional({ format: 'date-time', description: 'Original local creation time.' })
  @IsOptional()
  @IsISO8601({ strict: true })
  createdAt?: string;
}
