import { ApiProperty } from '@nestjs/swagger';
import { RecordSyncStatus } from '@prisma/client';

export class NoteResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) userId!: string;
  @ApiProperty({ nullable: true }) clientId!: string | null;
  @ApiProperty() content!: string;
  @ApiProperty() noteType!: string;
  @ApiProperty({ type: String, isArray: true }) emotions!: string[];
  @ApiProperty({ type: String, isArray: true }) categories!: string[];
  @ApiProperty({ enum: RecordSyncStatus, enumName: 'RecordSyncStatus' }) syncStatus!: RecordSyncStatus;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: Date;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) deletedAt!: Date | null;
}

export class NotesPageResponseDto {
  @ApiProperty({ type: NoteResponseDto, isArray: true }) notes!: NoteResponseDto[];
  @ApiProperty({ minimum: 0 }) total!: number;
  @ApiProperty({ minimum: 1, maximum: 200 }) limit!: number;
  @ApiProperty({ minimum: 0 }) offset!: number;
}
