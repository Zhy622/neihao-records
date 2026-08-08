import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsISO8601, IsOptional, IsString, Length, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown => typeof value === 'string' ? value.trim() : value;

export class CreateNoteDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 100 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  clientId?: string;

  @ApiProperty({ minLength: 1, maxLength: 20000 })
  @Transform(trim)
  @IsString()
  @Length(1, 20000)
  content!: string;

  @ApiProperty({ minLength: 1, maxLength: 100 })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  noteType!: string;

  @ApiProperty({ type: String, isArray: true })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  emotions!: string[];

  @ApiProperty({ type: String, isArray: true })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(7)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  categories!: string[];

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601({ strict: true })
  createdAt?: string;
}
