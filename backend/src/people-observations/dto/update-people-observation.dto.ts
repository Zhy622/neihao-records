import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { PeopleObservationEmotion } from '@prisma/client';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class UpdatePeopleObservationDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 100 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  alias?: string;

  @ApiPropertyOptional({ enum: PeopleObservationEmotion, enumName: 'PeopleObservationEmotion', isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(7)
  @IsEnum(PeopleObservationEmotion, { each: true })
  emotions?: PeopleObservationEmotion[];

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
}
