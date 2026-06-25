import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: 'neihao-records-backend' })
  service!: string;

  @ApiProperty({ format: 'date-time' })
  timestamp!: string;
}

export class DatabaseHealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: 'reachable' })
  database!: string;

  @ApiProperty({ format: 'date-time' })
  timestamp!: string;
}
