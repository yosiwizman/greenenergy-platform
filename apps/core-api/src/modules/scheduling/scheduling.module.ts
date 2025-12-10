import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SchedulingService } from './scheduling.service';
import { SchedulingController } from './scheduling.controller';
import { MaterialModule } from '../material/material.module';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [ConfigModule, MaterialModule, RiskModule],
  controllers: [SchedulingController],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
