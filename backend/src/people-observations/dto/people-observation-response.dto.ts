import { ApiProperty } from '@nestjs/swagger';
import {
  PeopleObservationEmotion,
  RecordSyncStatus,
} from '@prisma/client';

export class PeopleObservationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ nullable: true })
  clientId!: string | null;

  @ApiProperty()
  alias!: string;

  @ApiProperty({ enum: PeopleObservationEmotion, enumName: 'PeopleObservationEmotion', isArray: true })
  emotions!: PeopleObservationEmotion[];

  @ApiProperty()
  triggerScene!: string;

  @ApiProperty()
  contemptPoints!: string;

  @ApiProperty()
  inferiorityOrEnvyPoints!: string;

  @ApiProperty()
  otherStrengths!: string;

  @ApiProperty()
  myStrengths!: string;

  @ApiProperty()
  personDefinition!: string;

  @ApiProperty()
  learningAction!: string;

  @ApiProperty({ enum: RecordSyncStatus, enumName: 'RecordSyncStatus' })
  syncStatus!: RecordSyncStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  deletedAt!: Date | null;
}

export class PeopleObservationsPageResponseDto {
  @ApiProperty({ type: PeopleObservationResponseDto, isArray: true })
  peopleObservations!: PeopleObservationResponseDto[];

  @ApiProperty({ minimum: 0 })
  total!: number;

  @ApiProperty({ minimum: 1, maximum: 200 })
  limit!: number;

  @ApiProperty({ minimum: 0 })
  offset!: number;
}
