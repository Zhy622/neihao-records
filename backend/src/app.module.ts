import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PeopleObservationsModule } from './people-observations/people-observations.module';
import { PrismaModule } from './prisma/prisma.module';
import { RecordsModule } from './records/records.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    PrismaModule,
    AuthModule,
    RecordsModule,
    PeopleObservationsModule,
    HealthModule,
    AiModule,
  ],
})
export class AppModule {}
