import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsOptional, IsString, Length, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown => typeof value === 'string' ? value.trim() : value;

export class UpdateNoteDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 20000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 20000)
  content?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 100 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  noteType?: string;

  @ApiPropertyOptional({ type: String, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  emotions?: string[];

  @ApiPropertyOptional({ type: String, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(7)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  categories?: string[];
}
