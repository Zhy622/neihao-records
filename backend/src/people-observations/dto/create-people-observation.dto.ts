import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { PeopleObservationEmotion } from '@prisma/client';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreatePeopleObservationDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 100, description: 'Stable client-generated ID.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  clientId?: string;

  @ApiProperty({ minLength: 1, maxLength: 100, example: 'A colleague' })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  alias!: string;

  @ApiProperty({ enum: PeopleObservationEmotion, enumName: 'PeopleObservationEmotion', isArray: true })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(7)
  @IsEnum(PeopleObservationEmotion, { each: true })
  emotions!: PeopleObservationEmotion[];

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  triggerScene?: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  contemptPoints?: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  inferiorityOrEnvyPoints?: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  otherStrengths?: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  myStrengths?: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  personDefinition?: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  learningAction?: string;

  @ApiPropertyOptional({ format: 'date-time', description: 'Original local creation time.' })
  @IsOptional()
  @IsISO8601({ strict: true })
  createdAt?: string;
}
