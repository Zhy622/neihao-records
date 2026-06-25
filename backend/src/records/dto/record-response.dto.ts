import { ApiProperty } from '@nestjs/swagger';
import {
  Category,
  Emotion,
  RecordSyncStatus,
  TimeCost,
  WorthIt,
} from '@prisma/client';

export class RecordResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ nullable: true })
  clientId!: string | null;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: Category, enumName: 'Category' })
  category!: Category;

  @ApiProperty({ enum: Emotion, enumName: 'Emotion', isArray: true })
  emotions!: Emotion[];

  @ApiProperty({ minimum: 1, maximum: 10 })
  emotionIntensity!: number;

  @ApiProperty({ minimum: 1, maximum: 10 })
  decisionDifficulty!: number;

  @ApiProperty({ enum: TimeCost, enumName: 'TimeCost' })
  timeCost!: TimeCost;

  @ApiProperty()
  thoughts!: string;

  @ApiProperty()
  finalDecision!: string;

  @ApiProperty({ enum: WorthIt, enumName: 'WorthIt' })
  worthIt!: WorthIt;

  @ApiProperty({ enum: RecordSyncStatus, enumName: 'RecordSyncStatus' })
  syncStatus!: RecordSyncStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  deletedAt!: Date | null;
}

export class RecordsPageResponseDto {
  @ApiProperty({ type: RecordResponseDto, isArray: true })
  records!: RecordResponseDto[];

  @ApiProperty({ minimum: 0 })
  total!: number;

  @ApiProperty({ minimum: 1, maximum: 200 })
  limit!: number;

  @ApiProperty({ minimum: 0 })
  offset!: number;
}
