import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateRecordInsightDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  emotions?: string[];

  @IsOptional()
  @IsString()
  thoughts?: string;

  @IsOptional()
  @IsString()
  finalDecision?: string;
}