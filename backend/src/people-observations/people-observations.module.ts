import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PeopleObservationsController } from './people-observations.controller';
import { PeopleObservationsService } from './people-observations.service';

@Module({
  imports: [AuthModule],
  controllers: [PeopleObservationsController],
  providers: [PeopleObservationsService],
})
export class PeopleObservationsModule {}
